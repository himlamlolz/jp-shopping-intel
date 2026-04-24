import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getWishlist,
  saveWishlist,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  getProfile,
  saveProfile,
  getFollowingMap,
  toggleFollowAccount,
  getDiscoveryItems,
  saveDiscoveryItems,
  addDiscoveryItem,
  updateDiscoveryItem,
  mergeWishlist,
  mergeProfile,
  mergeDiscoveryItems,
  getVisionApiKey,
  setVisionApiKey,
  getUserAccounts,
  saveUserAccounts,
} from '@/lib/storage'
import type { WishlistItem, InterestProfile, DiscoveryItem, SocialAccount } from '@/lib/types'

// Helper factories
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

describe('storage', () => {
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

  // ── Wishlist ─────────────────────────────────────────────────────────────────

  describe('getWishlist / saveWishlist', () => {
    it('returns empty array when no data stored', () => {
      expect(getWishlist()).toEqual([])
    })

    it('saves and retrieves wishlist items', () => {
      const item = makeItem()
      saveWishlist([item])
      const retrieved = getWishlist()
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0].title).toBe('Test Figure')
    })

    it('restores Date objects from stored JSON', () => {
      const item = makeItem()
      saveWishlist([item])
      const retrieved = getWishlist()
      expect(retrieved[0].createdAt).toBeInstanceOf(Date)
      expect(retrieved[0].updatedAt).toBeInstanceOf(Date)
    })

    it('handles corrupted localStorage gracefully', () => {
      store['jp-shopping-intel:wishlist'] = 'not-valid-json'
      expect(getWishlist()).toEqual([])
    })
  })

  describe('addWishlistItem', () => {
    it('adds item to empty wishlist', () => {
      addWishlistItem(makeItem())
      expect(getWishlist()).toHaveLength(1)
    })

    it('prepends new item to front of list', () => {
      const first = makeItem({ id: 'item-1', title: 'First' })
      const second = makeItem({ id: 'item-2', title: 'Second' })
      addWishlistItem(first)
      addWishlistItem(second)
      const items = getWishlist()
      expect(items[0].title).toBe('Second')
      expect(items[1].title).toBe('First')
    })
  })

  describe('updateWishlistItem', () => {
    it('updates a specific item', () => {
      addWishlistItem(makeItem({ id: 'item-1', title: 'Original' }))
      updateWishlistItem('item-1', { title: 'Updated' })
      const items = getWishlist()
      expect(items[0].title).toBe('Updated')
    })

    it('sets updatedAt when updating', () => {
      const before = new Date('2024-01-01T00:00:00Z')
      addWishlistItem(makeItem({ id: 'item-1', updatedAt: before }))
      updateWishlistItem('item-1', { title: 'Updated' })
      const items = getWishlist()
      expect(items[0].updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('does nothing when item ID not found', () => {
      addWishlistItem(makeItem({ id: 'item-1', title: 'Original' }))
      updateWishlistItem('non-existent', { title: 'Updated' })
      expect(getWishlist()[0].title).toBe('Original')
    })
  })

  describe('deleteWishlistItem', () => {
    it('removes item by ID', () => {
      addWishlistItem(makeItem({ id: 'item-1' }))
      addWishlistItem(makeItem({ id: 'item-2' }))
      deleteWishlistItem('item-1')
      const items = getWishlist()
      expect(items).toHaveLength(1)
      expect(items[0].id).toBe('item-2')
    })

    it('does nothing when ID not found', () => {
      addWishlistItem(makeItem({ id: 'item-1' }))
      deleteWishlistItem('non-existent')
      expect(getWishlist()).toHaveLength(1)
    })
  })

  describe('mergeWishlist', () => {
    it('merges items without duplicates', () => {
      addWishlistItem(makeItem({ id: 'item-1', title: 'Old' }))
      mergeWishlist([makeItem({ id: 'item-1', title: 'New' }), makeItem({ id: 'item-2', title: 'Extra' })])
      const items = getWishlist()
      expect(items).toHaveLength(2)
    })

    it('incoming items overwrite existing items with same ID', () => {
      addWishlistItem(makeItem({ id: 'item-1', title: 'Old' }))
      mergeWishlist([makeItem({ id: 'item-1', title: 'New' })])
      expect(getWishlist()[0].title).toBe('New')
    })

    it('adds new items not present in existing list', () => {
      addWishlistItem(makeItem({ id: 'item-1' }))
      mergeWishlist([makeItem({ id: 'item-2', title: 'Newly Added' })])
      expect(getWishlist()).toHaveLength(2)
    })
  })

  // ── Profile ──────────────────────────────────────────────────────────────────

  describe('getProfile / saveProfile', () => {
    it('returns default profile when none stored', () => {
      const profile = getProfile()
      expect(profile.id).toBe('default')
      expect(profile.keywords.length).toBeGreaterThan(0)
      expect(profile.preferredCurrency).toBe('USD')
    })

    it('saves and retrieves custom profile', () => {
      const custom: InterestProfile = {
        id: 'default',
        keywords: [{ en: 'Test', ja: 'テスト' }],
        franchises: ['Test'],
        platforms: ['mercari'],
        preferredCurrency: 'EUR',
        proxyServiceFee: 500,
        internationalShippingEstimate: 3000,
      }
      saveProfile(custom)
      const retrieved = getProfile()
      expect(retrieved.preferredCurrency).toBe('EUR')
      expect(retrieved.proxyServiceFee).toBe(500)
    })
  })

  describe('mergeProfile', () => {
    it('merges only provided keys', () => {
      saveProfile(getProfile()) // store default
      mergeProfile({ preferredCurrency: 'GBP' })
      const profile = getProfile()
      expect(profile.preferredCurrency).toBe('GBP')
      expect(profile.id).toBe('default') // unchanged
    })

    it('does not overwrite with undefined values', () => {
      mergeProfile({ preferredCurrency: undefined })
      expect(getProfile().preferredCurrency).toBe('USD') // default unchanged
    })

    it('merges keywords array', () => {
      const newKeywords = [{ en: 'NewSeries', ja: '新シリーズ' }]
      mergeProfile({ keywords: newKeywords })
      expect(getProfile().keywords).toEqual(newKeywords)
    })
  })

  // ── Discovery Items ──────────────────────────────────────────────────────────

  describe('getDiscoveryItems / saveDiscoveryItems', () => {
    it('returns empty array when none stored', () => {
      expect(getDiscoveryItems()).toEqual([])
    })

    it('saves and retrieves discovery items', () => {
      saveDiscoveryItems([makeDiscoveryItem()])
      const items = getDiscoveryItems()
      expect(items).toHaveLength(1)
      expect(items[0].sourceAccountHandle).toBe('@testaccount')
    })

    it('restores Date objects for createdAt and autoDismissAt', () => {
      saveDiscoveryItems([makeDiscoveryItem()])
      const items = getDiscoveryItems()
      expect(items[0].createdAt).toBeInstanceOf(Date)
      expect(items[0].autoDismissAt).toBeInstanceOf(Date)
    })

    it('restores snoozedUntil as Date when present', () => {
      const snoozed = makeDiscoveryItem({ snoozedUntil: new Date('2024-03-01T00:00:00Z') })
      saveDiscoveryItems([snoozed])
      const items = getDiscoveryItems()
      expect(items[0].snoozedUntil).toBeInstanceOf(Date)
    })

    it('leaves snoozedUntil as undefined when not present', () => {
      saveDiscoveryItems([makeDiscoveryItem()])
      expect(getDiscoveryItems()[0].snoozedUntil).toBeUndefined()
    })
  })

  describe('addDiscoveryItem', () => {
    it('prepends item to list', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'disc-1' }))
      addDiscoveryItem(makeDiscoveryItem({ id: 'disc-2' }))
      expect(getDiscoveryItems()[0].id).toBe('disc-2')
    })
  })

  describe('updateDiscoveryItem', () => {
    it('updates a specific discovery item', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'disc-1', status: 'inbox' }))
      updateDiscoveryItem('disc-1', { status: 'dismissed' })
      expect(getDiscoveryItems()[0].status).toBe('dismissed')
    })

    it('does nothing when ID not found', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'disc-1' }))
      updateDiscoveryItem('non-existent', { status: 'dismissed' })
      expect(getDiscoveryItems()[0].status).toBe('inbox')
    })
  })

  describe('mergeDiscoveryItems', () => {
    it('merges without duplicates', () => {
      addDiscoveryItem(makeDiscoveryItem({ id: 'disc-1', status: 'inbox' }))
      mergeDiscoveryItems([
        makeDiscoveryItem({ id: 'disc-1', status: 'dismissed' }),
        makeDiscoveryItem({ id: 'disc-2' }),
      ])
      const items = getDiscoveryItems()
      expect(items).toHaveLength(2)
      const disc1 = items.find(i => i.id === 'disc-1')
      expect(disc1?.status).toBe('dismissed')
    })
  })

  // ── Accounts / Following ──────────────────────────────────────────────────────

  describe('getUserAccounts / saveUserAccounts', () => {
    it('returns empty array when none stored', () => {
      expect(getUserAccounts()).toEqual([])
    })

    it('saves and retrieves accounts', () => {
      saveUserAccounts([makeSocialAccount()])
      const accounts = getUserAccounts()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].handle).toBe('@testhandle')
    })

    it('restores addedAt as Date', () => {
      saveUserAccounts([makeSocialAccount()])
      const accounts = getUserAccounts()
      expect(accounts[0].addedAt).toBeInstanceOf(Date)
    })
  })

  describe('getFollowingMap / toggleFollowAccount', () => {
    it('returns empty map when none stored', () => {
      expect(getFollowingMap()).toEqual({})
    })

    it('toggles follow on (false → true)', () => {
      toggleFollowAccount('account-1')
      expect(getFollowingMap()['account-1']).toBe(true)
    })

    it('toggles follow off (true → false)', () => {
      toggleFollowAccount('account-1')
      toggleFollowAccount('account-1')
      expect(getFollowingMap()['account-1']).toBe(false)
    })

    it('toggling one account does not affect others', () => {
      toggleFollowAccount('account-1')
      expect(getFollowingMap()['account-2']).toBeUndefined()
    })
  })

  // ── Vision API Key ────────────────────────────────────────────────────────────

  describe('getVisionApiKey / setVisionApiKey', () => {
    it('returns empty string when none stored', () => {
      expect(getVisionApiKey()).toBe('')
    })

    it('stores and retrieves Vision API key', () => {
      setVisionApiKey('my-secret-key-abc123')
      expect(getVisionApiKey()).toBe('my-secret-key-abc123')
    })

    it('overwrites previous key', () => {
      setVisionApiKey('first-key')
      setVisionApiKey('second-key')
      expect(getVisionApiKey()).toBe('second-key')
    })
  })
})
