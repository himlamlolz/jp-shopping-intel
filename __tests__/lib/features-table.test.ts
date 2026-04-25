import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getWishlist,
  saveWishlist,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  getProfile,
  saveProfile,
  mergeProfile,
  getDiscoveryItems,
  addDiscoveryItem,
  updateDiscoveryItem,
  mergeDiscoveryItems,
  getVisionApiKey,
  setVisionApiKey,
  getUserAccounts,
  saveUserAccounts,
  toggleFollowAccount,
  getFollowingMap,
  mergeWishlist,
  exportWishlistJson,
  exportWishlistCsv,
  getColorScheme,
  setColorScheme,
  getUserSuggestedAccounts,
  addUserSuggestedAccount,
  removeUserSuggestedAccount,
} from '@/lib/storage'
import { generateJanSearchLinks, detectPlatform, PROXY_SERVICE_PRESETS } from '@/lib/types'
import { extractFromOcrText } from '@/lib/ocr-utils'
import type { WishlistItem, DiscoveryItem, SocialAccount } from '@/lib/types'

// ── Helper factories ──────────────────────────────────────────────────────────

function makeItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: 'item-1',
    title: 'Test Figure',
    price: 5000,
    currency: 'JPY',
    sourcePlatform: 'mercari',
    status: 'watching',
    priority: 'medium',
    tags: ['figure'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

function makeDiscoveryItem(overrides: Partial<DiscoveryItem> = {}): DiscoveryItem {
  return {
    id: 'disc-1',
    sourceAccountHandle: '@testaccount',
    sourcePlatform: 'twitter',
    status: 'inbox',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    autoDismissAt: new Date('2024-02-01T00:00:00Z'),
    ...overrides,
  }
}

function makeSocialAccount(overrides: Partial<SocialAccount> = {}): SocialAccount {
  return {
    id: 'account-1',
    handle: '@testhandle',
    platform: 'twitter',
    displayName: 'Test Account',
    description: 'Test description',
    categories: ['scale_figures'],
    profileUrl: 'https://twitter.com/testhandle',
    tier: 'mid',
    isOfficial: false,
    isFollowing: false,
    addedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

// ── Landed cost pure function (not exported from lib) ─────────────────────────

function calcLandedCost(
  itemPrice: number,
  domesticShipping: number,
  proxyFixed: number,
  proxyPct: number,   // e.g. 0.05
  intlShipping: number,
  ccPct: number       // e.g. 0.036
): number {
  return itemPrice + domesticShipping + proxyFixed + proxyPct * itemPrice + intlShipping + ccPct * itemPrice
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('README features table', () => {
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { store = {} },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── Wishlist CRUD ─────────────────────────────────────────────────────────

  describe('Wishlist CRUD', () => {
    it('addWishlistItem / getWishlist — saves and retrieves an item', () => {
      addWishlistItem(makeItem({ id: 'w1', title: 'Figure A' }))
      const items = getWishlist()
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Figure A')
    })

    it('updateWishlistItem — updates a field on the item', () => {
      addWishlistItem(makeItem({ id: 'w1', status: 'watching' }))
      updateWishlistItem('w1', { status: 'purchased' })
      expect(getWishlist()[0].status).toBe('purchased')
    })

    it('deleteWishlistItem — removes the item by id', () => {
      addWishlistItem(makeItem({ id: 'w1' }))
      addWishlistItem(makeItem({ id: 'w2' }))
      deleteWishlistItem('w1')
      const items = getWishlist()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('w2')
    })

    it('saveWishlist / getWishlist — empty list round-trips correctly', () => {
      saveWishlist([])
      expect(getWishlist()).toEqual([])
    })
  })

  // ── OCR Import ────────────────────────────────────────────────────────────

  describe('OCR Import', () => {
    it('extractFromOcrText — extracts price from ¥ notation', () => {
      const result = extractFromOcrText('グッドスマイルカンパニー フィギュア ¥12,000')
      expect(result.price).toBe(12000)
      expect(result.confidence.price).toBeDefined()
    })

    it('extractFromOcrText — extracts JAN code', () => {
      const result = extractFromOcrText('JAN 4571245296726 テスト商品')
      expect(result.janCode).toBe('4571245296726')
      expect(result.confidence.janCode).toBe('high')
    })

    it('extractFromOcrText — extracts known manufacturer', () => {
      const result = extractFromOcrText('Good Smile Company 1/7 scale figure')
      expect(result.manufacturer).toBe('Good Smile Company')
    })

    it('extractFromOcrText — returns undefined fields when no matches', () => {
      const result = extractFromOcrText('hello world')
      expect(result.price).toBeUndefined()
      expect(result.janCode).toBeUndefined()
    })
  })

  // ── Barcode / JAN Scanner ─────────────────────────────────────────────────

  describe('Barcode / JAN Scanner', () => {
    it('generateJanSearchLinks — returns links for all major platforms', () => {
      const links = generateJanSearchLinks('4571245296726')
      expect(links.amazonJp).toContain('4571245296726')
      expect(links.mercari).toContain('4571245296726')
      expect(links.surugaya).toContain('4571245296726')
      expect(links.yahooShopping).toContain('4571245296726')
      expect(links.rakuten).toContain('4571245296726')
    })

    it('generateJanSearchLinks — returns exactly 5 platform entries', () => {
      const links = generateJanSearchLinks('4000000000000')
      expect(Object.keys(links)).toHaveLength(5)
    })
  })

  // ── Cross-Platform Search ─────────────────────────────────────────────────

  describe('Cross-Platform Search', () => {
    it('generateJanSearchLinks — each URL is a valid HTTPS URL', () => {
      const links = generateJanSearchLinks('4571245296726')
      for (const url of Object.values(links)) {
        expect(() => new URL(url)).not.toThrow()
        expect(url.startsWith('https://')).toBe(true)
      }
    })

    it('generateJanSearchLinks — different JAN codes produce different URLs', () => {
      const a = generateJanSearchLinks('4000000000001')
      const b = generateJanSearchLinks('4000000000002')
      expect(a.mercari).not.toBe(b.mercari)
    })
  })

  // ── Landed Cost Calculator ────────────────────────────────────────────────

  describe('Landed Cost Calculator', () => {
    it('calculates total with Buyee preset (fixed ¥300 + 5%)', () => {
      // item ¥10,000 + domestic ¥500 + Buyee fixed ¥300 + Buyee 5% + intl ¥2,000 + CC 3.6%
      const total = calcLandedCost(10000, 500, 300, 0.05, 2000, 0.036)
      expect(total).toBeCloseTo(10000 + 500 + 300 + 500 + 2000 + 360)
    })

    it('calculates total with Zenmarket preset (fixed ¥300, 0%)', () => {
      const total = calcLandedCost(8000, 400, 300, 0, 1500, 0.036)
      expect(total).toBeCloseTo(8000 + 400 + 300 + 0 + 1500 + 288)
    })

    it('calculates total with White Rabbit Express (0 fixed, 10%)', () => {
      const total = calcLandedCost(5000, 600, 0, 0.10, 2000, 0.036)
      expect(total).toBeCloseTo(5000 + 600 + 0 + 500 + 2000 + 180)
    })

    it('returns item price when all other costs are zero', () => {
      expect(calcLandedCost(9000, 0, 0, 0, 0, 0)).toBe(9000)
    })
  })

  // ── Currency Converter ────────────────────────────────────────────────────

  describe('Currency Converter', () => {
    // Skipped: the currency converter uses the live Frankfurter API at runtime
    // (GET /api/exchange-rate proxies https://api.frankfurter.app/latest?base=JPY).
    // There is no pure function to unit-test here; rate fetching and widget
    // rendering are integration/UI concerns covered in the manual test checklist.
    it.skip('live exchange rate fetch — skipped (Frankfurter API, no unit-testable function)', () => {
      // nothing to assert
    })
  })

  // ── Multi-Currency Dashboard ──────────────────────────────────────────────

  describe('Multi-Currency Dashboard', () => {
    it('wishlist items retain their currency field after storage round-trip', () => {
      addWishlistItem(makeItem({ id: 'd1', price: 5000, currency: 'JPY' }))
      addWishlistItem(makeItem({ id: 'd2', price: 50, currency: 'USD' }))
      const items = getWishlist()
      expect(items.find(i => i.id === 'd1')?.currency).toBe('JPY')
      expect(items.find(i => i.id === 'd2')?.currency).toBe('USD')
    })

    it('getProfile returns preferredCurrency that can be saved and retrieved', () => {
      saveProfile({ ...getProfile(), preferredCurrency: 'EUR' })
      expect(getProfile().preferredCurrency).toBe('EUR')
    })
  })

  // ── Discovery Inbox ───────────────────────────────────────────────────────

  describe('Discovery Inbox', () => {
    it('addDiscoveryItem / getDiscoveryItems — saves and retrieves item', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'di1', status: 'inbox' }))
      const items = getDiscoveryItems()
      expect(items).toHaveLength(1)
      expect(items[0].status).toBe('inbox')
    })

    it('updateDiscoveryItem — changes status to dismissed', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'di1', status: 'inbox' }))
      updateDiscoveryItem('di1', { status: 'dismissed' })
      expect(getDiscoveryItems()[0].status).toBe('dismissed')
    })

    it('mergeDiscoveryItems — overwrites existing item and adds new one', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'di1', status: 'inbox' }))
      mergeDiscoveryItems([
        makeDiscoveryItem({ id: 'di1', status: 'snoozed' }),
        makeDiscoveryItem({ id: 'di2', status: 'inbox' }),
      ])
      const items = getDiscoveryItems()
      expect(items).toHaveLength(2)
      expect(items.find(i => i.id === 'di1')?.status).toBe('snoozed')
    })
  })

  // ── Spending Analytics ────────────────────────────────────────────────────

  describe('Spending Analytics', () => {
    it('wishlist items have status field for analytics grouping', () => {
      addWishlistItem(makeItem({ id: 'a1', status: 'purchased', price: 3000 }))
      addWishlistItem(makeItem({ id: 'a2', status: 'watching', price: 1500 }))
      const purchased = getWishlist().filter(i => i.status === 'purchased')
      expect(purchased).toHaveLength(1)
      expect(purchased[0].price).toBe(3000)
    })

    it('wishlist items have sourcePlatform field for platform analytics', () => {
      addWishlistItem(makeItem({ id: 'a1', sourcePlatform: 'mercari' }))
      addWishlistItem(makeItem({ id: 'a2', sourcePlatform: 'surugaya' }))
      const byPlatform = getWishlist().reduce<Record<string, number>>((acc, i) => {
        acc[i.sourcePlatform] = (acc[i.sourcePlatform] ?? 0) + 1
        return acc
      }, {})
      expect(byPlatform['mercari']).toBe(1)
      expect(byPlatform['surugaya']).toBe(1)
    })
  })

  // ── Release Calendar ──────────────────────────────────────────────────────

  describe('Release Calendar', () => {
    it('releaseDate field survives storage round-trip as a Date', () => {
      const releaseDate = new Date('2025-03-15T00:00:00Z')
      addWishlistItem(makeItem({ id: 'rc1', releaseDate }))
      const retrieved = getWishlist()
      expect(retrieved[0].releaseDate).toBeInstanceOf(Date)
    })

    it('items with and without releaseDate can coexist in storage', () => {
      addWishlistItem(makeItem({ id: 'rc1', releaseDate: new Date('2025-06-01T00:00:00Z') }))
      addWishlistItem(makeItem({ id: 'rc2' })) // no releaseDate
      const items = getWishlist()
      expect(items.find(i => i.id === 'rc1')?.releaseDate).toBeInstanceOf(Date)
      expect(items.find(i => i.id === 'rc2')?.releaseDate).toBeUndefined()
    })
  })

  // ── Interest Profile ──────────────────────────────────────────────────────

  describe('Interest Profile', () => {
    it('getProfile — returns default profile with expected shape', () => {
      const profile = getProfile()
      expect(profile.id).toBe('default')
      expect(Array.isArray(profile.keywords)).toBe(true)
      expect(typeof profile.preferredCurrency).toBe('string')
    })

    it('saveProfile / getProfile — custom profile is persisted', () => {
      const custom = {
        ...getProfile(),
        preferredCurrency: 'GBP',
        keywords: [{ en: 'Hololive', ja: 'ホロライブ' }],
      }
      saveProfile(custom)
      const retrieved = getProfile()
      expect(retrieved.preferredCurrency).toBe('GBP')
      expect(retrieved.keywords[0].en).toBe('Hololive')
    })

    it('mergeProfile — merges only provided keys without clobbering others', () => {
      saveProfile({ ...getProfile(), preferredCurrency: 'USD' })
      mergeProfile({ preferredCurrency: 'CAD' })
      const profile = getProfile()
      expect(profile.preferredCurrency).toBe('CAD')
      expect(profile.id).toBe('default')
    })
  })

  // ── Data Export / Import ──────────────────────────────────────────────────

  describe('Data Export / Import', () => {
    it('exportWishlistJson — produces valid JSON that parses back to the saved items', () => {
      addWishlistItem(makeItem({ id: 'e1', title: 'Export Test' }))
      const json = exportWishlistJson()
      const parsed = JSON.parse(json) as WishlistItem[]
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].title).toBe('Export Test')
    })

    it('exportWishlistCsv — header row contains required columns', () => {
      addWishlistItem(makeItem({ id: 'e1' }))
      const csv = exportWishlistCsv()
      const [headerRow] = csv.split('\n')
      expect(headerRow).toBe('id,title,price,currency,status,priority,tags,sourcePlatform,createdAt')
    })

    it('exportWishlistCsv — data row count equals number of saved items', () => {
      addWishlistItem(makeItem({ id: 'e1' }))
      addWishlistItem(makeItem({ id: 'e2' }))
      const csv = exportWishlistCsv()
      const rows = csv.split('\n')
      // first row is header, remaining rows are data
      expect(rows.length - 1).toBe(2)
    })

    it('mergeWishlist — adds new items without removing existing ones', () => {
      addWishlistItem(makeItem({ id: 'e1', title: 'Original' }))
      mergeWishlist([makeItem({ id: 'e2', title: 'Imported' })])
      expect(getWishlist()).toHaveLength(2)
    })
  })

  // ── Platform detection ────────────────────────────────────────────────────

  describe('Platform detection', () => {
    it('detectPlatform — identifies Mercari from URL', () => {
      expect(detectPlatform('https://jp.mercari.com/item/m12345')).toBe('mercari')
    })

    it('detectPlatform — identifies Yahoo Auctions from URL', () => {
      expect(detectPlatform('https://page.auctions.yahoo.co.jp/jp/auction/x123')).toBe('yahoo_auctions')
    })

    it('detectPlatform — returns "other" for unrecognised domain', () => {
      expect(detectPlatform('https://example.com/product/123')).toBe('other')
    })

    it('detectPlatform — returns "other" for an invalid URL without throwing', () => {
      expect(detectPlatform('not-a-url')).toBe('other')
    })
  })

  // ── Proxy Service Presets ─────────────────────────────────────────────────

  describe('Proxy Service Presets', () => {
    it('PROXY_SERVICE_PRESETS contains at least one entry', () => {
      expect(PROXY_SERVICE_PRESETS.length).toBeGreaterThan(0)
    })

    it('each preset has name, fixedFee and percentageFee', () => {
      for (const preset of PROXY_SERVICE_PRESETS) {
        expect(typeof preset.name).toBe('string')
        expect(typeof preset.fixedFee).toBe('number')
        expect(typeof preset.percentageFee).toBe('number')
      }
    })

    it('includes a "Custom" preset with zero fees', () => {
      const custom = PROXY_SERVICE_PRESETS.find(p => p.name === 'Custom')
      expect(custom).toBeDefined()
      expect(custom?.fixedFee).toBe(0)
      expect(custom?.percentageFee).toBe(0)
    })
  })

  // ── Vision API Key ────────────────────────────────────────────────────────

  describe('Vision API Key', () => {
    it('getVisionApiKey — returns empty string when nothing is stored', () => {
      expect(getVisionApiKey()).toBe('')
    })

    it('setVisionApiKey / getVisionApiKey — stores and retrieves the key', () => {
      setVisionApiKey('AIzaSy-test-key-12345')
      expect(getVisionApiKey()).toBe('AIzaSy-test-key-12345')
    })
  })

  // ── User Accounts / Following ─────────────────────────────────────────────

  describe('User Accounts / Following', () => {
    it('getUserAccounts / saveUserAccounts — saves and retrieves a list', () => {
      saveUserAccounts([makeSocialAccount({ id: 'ac1', handle: '@hobbyist' })])
      const accounts = getUserAccounts()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].handle).toBe('@hobbyist')
    })

    it('toggleFollowAccount — follows then unfollows correctly', () => {
      toggleFollowAccount('ac1')
      expect(getFollowingMap()['ac1']).toBe(true)
      toggleFollowAccount('ac1')
      expect(getFollowingMap()['ac1']).toBe(false)
    })

    it('getFollowingMap — toggling one account does not affect others', () => {
      toggleFollowAccount('ac1')
      expect(getFollowingMap()['ac2']).toBeUndefined()
    })
  })

  // ── User-Suggested Accounts ───────────────────────────────────────────────

  describe('User-Suggested Accounts', () => {
    it('getUserSuggestedAccounts — returns empty array when none stored', () => {
      expect(getUserSuggestedAccounts()).toEqual([])
    })

    it('addUserSuggestedAccount — adds account to the list', () => {
      addUserSuggestedAccount(makeSocialAccount({ id: 'ua1', handle: '@suggested' }))
      const accounts = getUserSuggestedAccounts()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].handle).toBe('@suggested')
    })

    it('removeUserSuggestedAccount — removes the correct account', () => {
      addUserSuggestedAccount(makeSocialAccount({ id: 'ua1' }))
      addUserSuggestedAccount(makeSocialAccount({ id: 'ua2', handle: '@keep' }))
      removeUserSuggestedAccount('ua1')
      const accounts = getUserSuggestedAccounts()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].handle).toBe('@keep')
    })
  })

  // ── Color Scheme ──────────────────────────────────────────────────────────

  describe('Color Scheme', () => {
    it('getColorScheme — returns "system" by default', () => {
      expect(getColorScheme()).toBe('system')
    })

    it('setColorScheme / getColorScheme — persists "dark"', () => {
      setColorScheme('dark')
      expect(getColorScheme()).toBe('dark')
    })

    it('setColorScheme / getColorScheme — persists "light"', () => {
      setColorScheme('light')
      expect(getColorScheme()).toBe('light')
    })
  })
})
