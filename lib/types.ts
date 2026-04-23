export interface WishlistItem {
  id: string
  title: string
  titleJa?: string
  price: number
  priceConverted?: number
  currency: string
  sourceUrl?: string
  sourcePlatform: 'mercari' | 'yahoo_auctions' | 'surugaya' | 'melonbooks' | 'toranoana' | 'amazon_jp' | 'twitter' | 'other'
  screenshotUrl?: string
  status: 'watching' | 'bid_placed' | 'purchased' | 'arrived' | 'passed'
  priority: 'low' | 'medium' | 'high'
  priceCeiling?: number
  tags: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
  releaseDate?: Date
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  seller?: string
  listingId?: string
  realWorldCapture?: RealWorldCapture
}

export interface RealWorldCapture {
  photoUrl?: string
  janCode?: string
  ocrRawText?: string
  captureLocation?: string
  capturedAt: Date
}

export interface KeywordPair {
  en?: string
  ja?: string
}

export interface InterestProfile {
  id: string
  keywords: KeywordPair[]
  franchises: string[]
  platforms: string[]
  preferredCurrency: string
  proxyServiceFee: number
  internationalShippingEstimate: number
}

export interface SocialAccount {
  id: string
  handle: string
  platform: 'twitter' | 'instagram'
  displayName: string
  displayNameJa?: string
  description: string
  descriptionJa?: string
  categories: string[]
  profileUrl: string
  tier: 'major' | 'mid' | 'niche'
  isOfficial: boolean
  isFollowing: boolean
  addedAt: Date
}

export interface DiscoveryItem {
  id: string
  sourceAccountHandle: string
  sourcePlatform: string
  screenshotUrl?: string
  photoUrl?: string
  extractedText?: string
  suggestedTitle?: string
  suggestedPrice?: number
  suggestedTags?: string[]
  generatedSearchLinks?: Record<string, string>
  status: 'inbox' | 'added_to_wishlist' | 'dismissed' | 'snoozed'
  snoozedUntil?: Date
  createdAt: Date
  autoDismissAt: Date
}

export interface RealWorldOcrResult {
  rawText: string
  extractedTitle?: string
  extractedManufacturer?: string
  extractedSeriesName?: string
  extractedPrice?: number
  janCode?: string
  confidence: 'high' | 'medium' | 'low'
  suggestedTags: string[]
}

export interface ProxyServicePreset {
  name: string
  fixedFee: number
  percentageFee: number
}

export const PROXY_SERVICE_PRESETS: ProxyServicePreset[] = [
  { name: 'Buyee', fixedFee: 300, percentageFee: 0.05 },
  { name: 'Zenmarket', fixedFee: 300, percentageFee: 0 },
  { name: 'White Rabbit Express', fixedFee: 0, percentageFee: 0.10 },
  { name: 'FROM JAPAN', fixedFee: 0, percentageFee: 0.05 },
  { name: 'Custom', fixedFee: 0, percentageFee: 0 },
]

export const KNOWN_MANUFACTURERS = [
  'Kotobukiya', 'Good Smile Company', 'Max Factory', 'Alter', 'Kadokawa',
  'Fujimi Shobo', 'Hobby Japan', 'Bandai', 'Furyu', 'Taito', 'Broccoli',
  'Bushiroad', 'C2機関', 'Aniplex', 'Medicom Toy', 'MegaHouse', 'Wave',
  'FREEing', 'Union Creative', 'Stronger', 'Sentinel',
  'コトブキヤ', 'グッドスマイルカンパニー', 'マックスファクトリー', 'バンダイ',
]

export function generateJanSearchLinks(janCode: string): Record<string, string> {
  return {
    amazonJp: `https://www.amazon.co.jp/s?k=${janCode}`,
    surugaya: `https://www.suruga-ya.jp/search/?search=${janCode}`,
    yahooShopping: `https://shopping.yahoo.co.jp/search?p=${janCode}`,
    mercari: `https://jp.mercari.com/search?keyword=${janCode}`,
    rakuten: `https://search.rakuten.co.jp/search/mall/${janCode}/`,
  }
}

export function detectPlatform(url: string): WishlistItem['sourcePlatform'] {
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('mercari')) return 'mercari'
    if (hostname.includes('yahoo')) return 'yahoo_auctions'
    if (hostname.includes('suruga-ya')) return 'surugaya'
    if (hostname.includes('melonbooks')) return 'melonbooks'
    if (hostname.includes('toranoana')) return 'toranoana'
    if (hostname.includes('amazon.co.jp')) return 'amazon_jp'
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter'
  } catch {
    // invalid URL
  }
  return 'other'
}
