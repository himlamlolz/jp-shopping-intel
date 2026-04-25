import { WishlistItem, InterestProfile, SocialAccount, DiscoveryItem } from './types'

const WISHLIST_KEY = 'jp-shopping-intel:wishlist'
const PROFILE_KEY = 'jp-shopping-intel:profile'
const ACCOUNTS_KEY = 'jp-shopping-intel:accounts'
const DISCOVERY_KEY = 'jp-shopping-intel:discovery'
const FOLLOWING_KEY = 'jp-shopping-intel:following'
const USER_ACCOUNTS_KEY = 'jp-shopping-intel:user-accounts'
const COLOR_SCHEME_KEY = 'jp-shopping-intel:color-scheme'

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function getItem<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isClient()) return
  localStorage.setItem(key, JSON.stringify(value))
}

export function getWishlist(): WishlistItem[] {
  const items = getItem<WishlistItem[]>(WISHLIST_KEY, [])
  return items.map(item => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    releaseDate: item.releaseDate ? new Date(item.releaseDate) : undefined,
    priceHistory: item.priceHistory?.map(h => ({ price: h.price, recordedAt: new Date(h.recordedAt) })),
  }))
}

export function saveWishlist(items: WishlistItem[]): void {
  setItem(WISHLIST_KEY, items)
}

export function addWishlistItem(item: WishlistItem): void {
  const itemWithHistory: WishlistItem = {
    ...item,
    priceHistory: [{ price: item.price, recordedAt: item.createdAt }],
  }
  const items = getWishlist()
  items.unshift(itemWithHistory)
  saveWishlist(items)
}

export function updateWishlistItem(id: string, updates: Partial<WishlistItem>): void {
  const items = getWishlist()
  const idx = items.findIndex(i => i.id === id)
  if (idx !== -1) {
    const current = items[idx]
    let priceHistory = current.priceHistory ?? [{ price: current.price, recordedAt: current.createdAt }]
    if (updates.price !== undefined && updates.price !== current.price) {
      priceHistory = [...priceHistory, { price: updates.price, recordedAt: new Date() }]
    }
    items[idx] = { ...current, ...updates, priceHistory, updatedAt: new Date() }
    saveWishlist(items)
  }
}

export function deleteWishlistItem(id: string): void {
  saveWishlist(getWishlist().filter(i => i.id !== id))
}

export function getProfile(): InterestProfile {
  return getItem<InterestProfile>(PROFILE_KEY, {
    id: 'default',
    keywords: [
      { en: 'Kantai Collection', ja: '艦これ' },
      { en: 'Hololive', ja: 'ホロライブ' },
      { en: 'Gunpla', ja: 'ガンプラ' },
    ],
    franchises: ['Kantai Collection', 'Hololive', 'Gunpla'],
    platforms: ['mercari', 'yahoo_auctions', 'surugaya'],
    preferredCurrency: 'USD',
    proxyServiceFee: 300,
    internationalShippingEstimate: 2000,
  })
}

export function saveProfile(profile: InterestProfile): void {
  setItem(PROFILE_KEY, profile)
}

export function getUserAccounts(): SocialAccount[] {
  const items = getItem<SocialAccount[]>(ACCOUNTS_KEY, [])
  return items.map(a => ({ ...a, addedAt: new Date(a.addedAt) }))
}

export function saveUserAccounts(accounts: SocialAccount[]): void {
  setItem(ACCOUNTS_KEY, accounts)
}

export function getFollowingMap(): Record<string, boolean> {
  return getItem<Record<string, boolean>>(FOLLOWING_KEY, {})
}

export function toggleFollowAccount(id: string): void {
  const following = getFollowingMap()
  following[id] = !following[id]
  setItem(FOLLOWING_KEY, following)
}

export function getDiscoveryItems(): DiscoveryItem[] {
  const items = getItem<DiscoveryItem[]>(DISCOVERY_KEY, [])
  return items.map(i => ({
    ...i,
    createdAt: new Date(i.createdAt),
    autoDismissAt: new Date(i.autoDismissAt),
    snoozedUntil: i.snoozedUntil ? new Date(i.snoozedUntil) : undefined,
  }))
}

export function saveDiscoveryItems(items: DiscoveryItem[]): void {
  setItem(DISCOVERY_KEY, items)
}

export function addDiscoveryItem(item: DiscoveryItem): void {
  const items = getDiscoveryItems()
  items.unshift(item)
  saveDiscoveryItems(items)
}

export function updateDiscoveryItem(id: string, updates: Partial<DiscoveryItem>): void {
  const items = getDiscoveryItems()
  const idx = items.findIndex(i => i.id === id)
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates }
    saveDiscoveryItems(items)
  }
}

export function mergeWishlist(incoming: WishlistItem[]): void {
  const existing = getWishlist()
  const map = new Map(existing.map(i => [i.id, i]))
  for (const item of incoming) map.set(item.id, item)
  saveWishlist(Array.from(map.values()))
}

export function mergeProfile(incoming: Partial<InterestProfile>): void {
  const existing = getProfile()
  const merged = { ...existing }
  ;(Object.keys(incoming) as (keyof InterestProfile)[]).forEach(key => {
    if (incoming[key] !== undefined) {
      (merged[key] as InterestProfile[typeof key]) = incoming[key]!
    }
  })
  saveProfile(merged)
}

export function mergeDiscoveryItems(incoming: DiscoveryItem[]): void {
  const existing = getDiscoveryItems()
  const map = new Map(existing.map(i => [i.id, i]))
  for (const item of incoming) map.set(item.id, item)
  saveDiscoveryItems(Array.from(map.values()))
}

export function getVisionApiKey(): string {
  return getItem<string>('jp-shopping-intel:vision-api-key', '')
}

export function setVisionApiKey(key: string): void {
  setItem('jp-shopping-intel:vision-api-key', key)
}

// ── Export helpers ────────────────────────────────────────────────────────────

export function exportWishlistJson(): string {
  return JSON.stringify(getWishlist())
}

export function exportWishlistCsv(): string {
  const items = getWishlist()
  const headers = ['id', 'title', 'price', 'currency', 'status', 'priority', 'tags', 'sourcePlatform', 'createdAt']
  const rows = items.map(i => [
    i.id,
    `"${i.title.replace(/"/g, '""')}"`,
    i.price,
    i.currency,
    i.status,
    i.priority,
    `"${i.tags.join(';')}"`,
    i.sourcePlatform,
    i.createdAt.toISOString(),
  ])
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

// ── Color scheme ──────────────────────────────────────────────────────────────

export function getColorScheme(): 'light' | 'dark' | 'system' {
  return getItem<'light' | 'dark' | 'system'>(COLOR_SCHEME_KEY, 'system')
}

export function setColorScheme(scheme: 'light' | 'dark' | 'system'): void {
  setItem(COLOR_SCHEME_KEY, scheme)
}

// ── User-suggested accounts ────────────────────────────────────────────────────

export function getUserSuggestedAccounts(): SocialAccount[] {
  const items = getItem<SocialAccount[]>(USER_ACCOUNTS_KEY, [])
  return items.map(a => ({ ...a, addedAt: new Date(a.addedAt) }))
}

export function addUserSuggestedAccount(account: SocialAccount): void {
  const accounts = getUserSuggestedAccounts()
  accounts.push(account)
  setItem(USER_ACCOUNTS_KEY, accounts)
}

export function removeUserSuggestedAccount(id: string): void {
  const accounts = getUserSuggestedAccounts().filter(a => a.id !== id)
  setItem(USER_ACCOUNTS_KEY, accounts)
}

