'use client'
import { useEffect, useState } from 'react'
import { Search, ExternalLink, Inbox, X, Clock, Plus, RefreshCw } from 'lucide-react'
import { getProfile, getFollowingMap, toggleFollowAccount, getDiscoveryItems, updateDiscoveryItem, addWishlistItem } from '@/lib/storage'
import { addDiscoveryItem } from '@/lib/storage'
import type { FeedItem } from '@/app/api/feed/route'
import { extractFromOcrText, imageFileToBase64 } from '@/lib/ocr-utils'
import { getVisionApiKey } from '@/lib/storage'
import type { SocialAccount, DiscoveryItem } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'
import rawAccounts from '@/data/curatedAccounts.json'

const curatedAccounts = rawAccounts as unknown as SocialAccount[]

const ALL_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'kantai_collection', label: 'KanColle' },
  { id: 'hololive', label: 'Hololive' },
  { id: 'scale_figures', label: 'Figures' },
  { id: 'gunpla', label: 'Gunpla' },
  { id: 'doujinshi', label: 'Doujinshi' },
  { id: 'events', label: 'Events' },
  { id: 'marketplace', label: 'Marketplace' },
]

export default function DiscoveryPage() {
  const [following, setFollowing] = useState<Record<string, boolean>>({})
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [accountSearch, setAccountSearch] = useState('')
  const [showFollowedOnly, setShowFollowedOnly] = useState(false)
  const [inboxItems, setInboxItems] = useState<DiscoveryItem[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [keywords, setKeywords] = useState<Array<{ en?: string; ja?: string }>>([])
  const [linksOpen, setLinksOpen] = useState(false)
  const [fetchingFeed, setFetchingFeed] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setFollowing(getFollowingMap())
    setInboxItems(getDiscoveryItems().filter(i => i.status === 'inbox'))
    setKeywords(getProfile().keywords)
  }, [])

  const handleFollowToggle = (id: string) => {
    toggleFollowAccount(id)
    setFollowing(getFollowingMap())
  }

  const profile = { keywords }

  // Score accounts by keyword overlap
  const scored = curatedAccounts.map(account => {
    const overlap = profile.keywords.reduce((count, kw) => {
      const term = (kw.ja ?? kw.en ?? '').toLowerCase().replace(/\s/g,'_')
      return count + (account.categories.some(c => c.includes(term) || term.includes(c)) ? 1 : 0)
    }, 0)
    return { ...account, score: overlap, isFollowing: following[account.id] ?? account.isFollowing }
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const tierOrder: Record<string, number> = { major: 0, mid: 1, niche: 2 }
    return (tierOrder[a.tier] ?? 2) - (tierOrder[b.tier] ?? 2)
  })

  const filteredAccounts = scored
    .filter(a => categoryFilter === 'all' || a.categories.includes(categoryFilter))
    .filter(a => !showFollowedOnly || a.isFollowing)
    .filter(a => accountSearch === '' || a.handle.toLowerCase().includes(accountSearch.toLowerCase()) || a.displayName.toLowerCase().includes(accountSearch.toLowerCase()))

  // Generate search links from keywords
  const jaKeywords = keywords.flatMap(k => [k.ja, k.en]).filter(Boolean) as string[]
  const searchLinks = [
    ...jaKeywords.flatMap(kw => [
      { label: `${kw} 新商品`, url: `https://twitter.com/search?q=${encodeURIComponent(kw+' 新商品')}&f=live`, platform: '𝕏 New Products', feedType: 'twitter' as const, feedKeyword: `${kw} 新商品` },
      { label: `${kw} 限定`, url: `https://twitter.com/search?q=${encodeURIComponent(kw+' 限定')}&f=live`, platform: '𝕏 Limited', feedType: 'twitter' as const, feedKeyword: `${kw} 限定` },
      { label: `${kw} — Mercari`, url: `https://jp.mercari.com/search?keyword=${encodeURIComponent(kw)}`, platform: 'Mercari', feedType: 'mercari' as const, feedKeyword: kw },
      { label: `${kw} — Suruga-ya`, url: `https://www.suruga-ya.jp/search/?search=${encodeURIComponent(kw)}`, platform: 'Suruga-ya', feedType: null, feedKeyword: null },
    ])
  ]

  const handleScreenshotDrop = async (file: File) => {
    setOcrLoading(true)
    try {
      const visionKey = getVisionApiKey()
      let text = ''
      if (visionKey) {
        const b64 = await imageFileToBase64(file)
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-vision-api-key': visionKey },
          body: JSON.stringify({ imageBase64: b64, mode: 'screenshot' }),
        })
        if (res.ok) { const d = await res.json() as { text: string }; text = d.text }
      }
      if (!text) {
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker(['jpn', 'eng'])
        const { data } = await worker.recognize(file)
        await worker.terminate()
        text = data.text
      }
      const allKw = keywords.flatMap(k => [k.en, k.ja]).filter(Boolean) as string[]
      const extracted = extractFromOcrText(text, allKw)
      const item: DiscoveryItem = {
        id: uuidv4(),
        sourceAccountHandle: 'screenshot',
        sourcePlatform: 'screenshot',
        extractedText: text,
        suggestedTitle: extracted.title,
        suggestedPrice: extracted.price,
        suggestedTags: extracted.seriesName ? [extracted.seriesName] : [],
        status: 'inbox',
        createdAt: new Date(),
        autoDismissAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
      addDiscoveryItem(item)
      setInboxItems(getDiscoveryItems().filter(i => i.status === 'inbox'))
    } finally { setOcrLoading(false) }
  }

  const handleDismiss = (id: string) => {
    updateDiscoveryItem(id, { status: 'dismissed' })
    setInboxItems(i => i.filter(x => x.id !== id))
  }

  const handleSnooze = (id: string) => {
    updateDiscoveryItem(id, { snoozedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'snoozed' })
    setInboxItems(i => i.filter(x => x.id !== id))
  }

  const handleAddToWishlist = (item: DiscoveryItem) => {
    addWishlistItem({
      id: uuidv4(),
      title: item.suggestedTitle ?? 'Untitled',
      price: item.suggestedPrice ?? 0,
      currency: 'JPY',
      sourcePlatform: 'other',
      status: 'watching',
      priority: 'medium',
      tags: item.suggestedTags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    updateDiscoveryItem(item.id, { status: 'added_to_wishlist' })
    setInboxItems(i => i.filter(x => x.id !== item.id))
  }

  const daysUntilDismiss = (date: Date) => Math.max(0, Math.ceil((date.getTime() - Date.now()) / (24*60*60*1000)))

  const handleFetchFeed = async (index: number, feedType: 'twitter' | 'mercari', feedKeyword: string) => {
    setFetchingFeed(prev => ({ ...prev, [index]: true }))
    try {
      const res = await fetch(
        `/api/feed?type=${feedType}&keyword=${encodeURIComponent(feedKeyword)}`
      )
      if (!res.ok) return
      const data = await res.json() as { items: FeedItem[] }
      const existingSourceIds = new Set(
        getDiscoveryItems().map(i => i.sourceId).filter(Boolean)
      )
      let added = 0
      for (const item of data.items) {
        if (existingSourceIds.has(item.guid)) continue
        const discoveryItem: DiscoveryItem = {
          id: uuidv4(),
          sourceAccountHandle: `search:${feedKeyword}`,
          sourcePlatform: feedType,
          sourceId: item.guid,
          suggestedTitle: item.title || item.description?.slice(0, 80) || 'Unknown Item',
          suggestedTags: [],
          status: 'inbox',
          createdAt: new Date(),
          autoDismissAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
        addDiscoveryItem(discoveryItem)
        added++
      }
      if (added > 0) setInboxItems(getDiscoveryItems().filter(i => i.status === 'inbox'))
    } finally {
      setFetchingFeed(prev => ({ ...prev, [index]: false }))
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Discovery</h1>
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left — Accounts + Search Links */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              {ALL_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${categoryFilter === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={accountSearch} onChange={e => setAccountSearch(e.target.value)} placeholder="Search accounts..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
              </div>
              <button onClick={() => setShowFollowedOnly(!showFollowedOnly)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${showFollowedOnly ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                Following only
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredAccounts.slice(0, 30).map(account => (
                <div key={account.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0 text-sm font-bold text-sky-600 dark:text-sky-400">
                    𝕏
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={account.profileUrl} target="_blank" rel="noopener noreferrer"
                        className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-indigo-600 flex items-center gap-1">
                        @{account.handle} <ExternalLink className="w-3 h-3" />
                      </a>
                      {account.isOfficial && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 rounded">Official</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{account.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {account.categories.slice(0,3).map(cat => (
                        <span key={cat} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{cat.replace('_',' ')}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleFollowToggle(account.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${following[account.id] ? 'bg-indigo-600 text-white' : 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400'}`}>
                    {following[account.id] ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Search Links Generator */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
            <button onClick={() => setLinksOpen(!linksOpen)} className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Search Links Generator</h2>
              <span className="text-gray-400">{linksOpen ? '▲' : '▼'}</span>
            </button>
            {linksOpen && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {searchLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-between gap-2 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 transition-colors text-sm min-w-0">
                      <span className="truncate text-gray-700 dark:text-gray-300">{link.label}</span>
                      <span className="text-xs text-gray-400 shrink-0">{link.platform}</span>
                    </a>
                    {link.feedType && (
                      <button
                        onClick={() => handleFetchFeed(i, link.feedType!, link.feedKeyword!)}
                        disabled={fetchingFeed[i]}
                        title="Fetch feed into inbox"
                        className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${fetchingFeed[i] ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                ))}
                {searchLinks.length === 0 && <p className="text-gray-400 text-sm col-span-2">Add keywords in Settings to generate links.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Right — Discovery Inbox */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-500" />
            Discovery Inbox {inboxItems.length > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">{inboxItems.length}</span>}
          </h2>

          {/* Screenshot drop zone */}
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleScreenshotDrop(f) }}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center mb-4 hover:border-indigo-300 transition-colors cursor-pointer"
          >
            {ocrLoading ? <p className="text-sm text-indigo-500 animate-pulse">Processing…</p> : (
              <label className="text-sm text-gray-500 cursor-pointer">
                Drop a screenshot here to add to inbox
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotDrop(f) }} />
              </label>
            )}
          </div>

          {inboxItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Inbox is empty</p>
          ) : (
            <div className="space-y-3">
              {inboxItems.map(item => (
                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.suggestedTitle ?? 'Unknown Item'}</p>
                      {item.suggestedPrice && <p className="text-sm text-indigo-600 dark:text-indigo-400">¥{item.suggestedPrice.toLocaleString()}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />{daysUntilDismiss(item.autoDismissAt)}d
                      </span>
                    </div>
                  </div>
                  {item.suggestedTags && item.suggestedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.suggestedTags.map(tag => (
                        <span key={tag} className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleAddToWishlist(item)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700">
                      <Plus className="w-3 h-3" /> Wishlist
                    </button>
                    <button onClick={() => handleSnooze(item.id)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 hover:border-amber-400">
                      <Clock className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDismiss(item.id)} className="px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 hover:border-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
