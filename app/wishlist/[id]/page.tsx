'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, X, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getWishlist, updateWishlistItem, deleteWishlistItem, getDiscoveryItems } from '@/lib/storage'
import { generateJanSearchLinks, type WishlistItem } from '@/lib/types'

const STATUSES: WishlistItem['status'][] = ['watching', 'bid_placed', 'purchased', 'arrived', 'passed']
const PRIORITIES: WishlistItem['priority'][] = ['low', 'medium', 'high']
const CONDITIONS: Array<{ value: NonNullable<WishlistItem['condition']>; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]
const PLATFORMS: WishlistItem['sourcePlatform'][] = ['mercari','yahoo_auctions','surugaya','melonbooks','toranoana','amazon_jp','twitter','other']

function buildTitleSearchLinks(title: string, titleJa?: string): Array<{ label: string; url: string }> {
  const q = encodeURIComponent(titleJa ?? title)
  return [
    { label: 'Mercari JP', url: `https://jp.mercari.com/search?keyword=${q}` },
    { label: 'Yahoo Auctions', url: `https://auctions.yahoo.co.jp/search/search?p=${q}` },
    { label: 'Suruga-ya', url: `https://www.suruga-ya.jp/search/?search=${q}` },
    { label: 'Amazon JP', url: `https://www.amazon.co.jp/s?k=${q}` },
    { label: 'Rakuten', url: `https://search.rakuten.co.jp/search/mall/${q}/` },
    { label: 'Melonbooks', url: `https://www.melonbooks.co.jp/search/search.php?name=${q}` },
    { label: 'Toranoana', url: `https://ec.toranoana.jp/tora/ec/cot/page/search/commodity/?search_key=${q}` },
  ]
}

const PLATFORM_LABELS: Record<string, string> = {
  amazonJp: 'Amazon JP',
  surugaya: 'Suruga-ya',
  yahooShopping: 'Yahoo Shopping',
  mercari: 'Mercari JP',
  rakuten: 'Rakuten',
}

function PriceSparkline({ history }: { history: { price: number; recordedAt: Date }[] }) {
  if (history.length < 2) return null
  const W = 200, H = 50
  const prices = history.map(h => h.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const pts = history.map((h, i) => {
    const x = (i / (history.length - 1)) * W
    const y = H - ((h.price - min) / range) * H
    return { x, y, price: h.price, date: h.recordedAt }
  })
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price history</p>
      <svg width={W} height={H + 4} className="overflow-visible">
        <polyline
          points={polyline}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1">
            <title>{`${new Date(p.date).toLocaleDateString()} — ¥${p.price.toLocaleString()}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1" style={{ width: W }}>
        <span>¥{min.toLocaleString()}</span>
        <span>¥{max.toLocaleString()}</span>
      </div>
    </div>
  )
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [item, setItem] = useState<WishlistItem | null | undefined>(undefined)
  const [form, setForm] = useState<Partial<WishlistItem>>({})
  const [chipInput, setChipInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cheaperInInbox, setCheaperInInbox] = useState(false)

  useEffect(() => {
    const found = getWishlist().find(i => i.id === id)
    if (found) {
      setItem(found)
      setForm({ ...found })
      // Feature 6: condition-aware price flag
      if ((found.condition === 'good' || found.condition === 'fair') && found.tags.length > 0) {
        const discoveryItems = getDiscoveryItems()
        const cheaper = discoveryItems.some(d =>
          d.suggestedPrice !== undefined &&
          d.suggestedPrice < found.price &&
          (d.suggestedTags ?? []).some(dt => found.tags.includes(dt))
        )
        setCheaperInInbox(cheaper)
      }
    } else {
      setItem(null)
    }
  }, [id])

  if (item === undefined) return null

  if (item === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Item not found.</p>
        <Link href="/wishlist" className="text-indigo-600 dark:text-indigo-400 hover:underline">← Back to Wishlist</Link>
      </div>
    )
  }

  const commitChip = (raw: string) => {
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean)
    if (!tags.length) return
    setForm(f => ({ ...f, tags: [...new Set([...(f.tags ?? []), ...tags])] }))
    setChipInput('')
  }

  const removeChip = (tag: string) => {
    setForm(f => ({ ...f, tags: (f.tags ?? []).filter(t => t !== tag) }))
  }

  const handleSave = () => {
    if (!form.title) return
    updateWishlistItem(id, form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = () => {
    if (!confirm('Delete this item permanently?')) return
    deleteWishlistItem(id)
    router.push('/wishlist')
  }

  const photoUrl = form.screenshotUrl ?? item.realWorldCapture?.photoUrl

  const janCode = form.listingId && /^4\d{12}$/.test(form.listingId) ? form.listingId : null
  const janLinks = janCode ? generateJanSearchLinks(janCode) : null
  const titleLinks = buildTitleSearchLinks(form.title ?? item.title, form.titleJa)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wishlist" className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate flex-1">{item.title}</h1>
        {item.sourceUrl && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0">
            View Listing <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {photoUrl && (
        <div className="mb-6 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center max-h-64">
          <img src={photoUrl} alt={item.title} className="w-full object-contain max-h-64" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
          <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Japanese Title</label>
          <input value={form.titleJa ?? ''} onChange={e => setForm(f => ({ ...f, titleJa: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (JPY)</label>
            <input type="number" value={form.price ?? ''} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
            <input value="JPY" readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 cursor-not-allowed" />
          </div>
        </div>

        {/* Price history sparkline (Feature 1) */}
        {item.priceHistory && item.priceHistory.length >= 2 && (
          <div className="pt-1">
            <PriceSparkline history={item.priceHistory} />
          </div>
        )}

        {/* Condition-aware price flag (Feature 6) */}
        {cheaperInInbox && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ Similar items seen for less in your inbox
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Ceiling (JPY)</label>
          <input type="number" value={form.priceCeiling ?? ''} onChange={e => setForm(f => ({ ...f, priceCeiling: parseInt(e.target.value) || undefined }))}
            placeholder="Optional budget ceiling"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
            <select value={form.sourcePlatform} onChange={e => setForm(f => ({ ...f, sourcePlatform: e.target.value as WishlistItem['sourcePlatform'] }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
              {PLATFORMS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as WishlistItem['status'] }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as WishlistItem['priority'] }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
            <select value={form.condition ?? ''} onChange={e => setForm(f => ({ ...f, condition: (e.target.value || undefined) as WishlistItem['condition'] }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
              <option value="">— none —</option>
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Release Date</label>
          <input
            type="date"
            value={form.releaseDate ? new Date(form.releaseDate).toISOString().slice(0, 10) : ''}
            onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value ? new Date(e.target.value) : undefined }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
          />
        </div>

        {/* Tags chip input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.tags ?? []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                {tag}
                <button type="button" onClick={() => removeChip(tag)} className="hover:text-indigo-900 dark:hover:text-indigo-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={chipInput}
            onChange={e => setChipInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                commitChip(chipInput)
              }
            }}
            onBlur={() => { if (chipInput.trim()) commitChip(chipInput) }}
            placeholder="Add tag…"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm resize-none" />
        </div>

        {/* Cross-platform search */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span>🔗 Find on other platforms</span>
            {searchOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {searchOpen && (
            <div className="p-4 space-y-4">
              {janLinks && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">By JAN Code ({janCode})</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(janLinks).map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                        {PLATFORM_LABELS[key] ?? key} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">By Title</p>
                <div className="flex flex-wrap gap-2">
                  {titleLinks.map(({ label, url }) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                      {label} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={!form.title}
          className={`w-full py-3 rounded-xl font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'}`}>
          {saved ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Saved</span> : 'Save Changes'}
        </button>

        <button onClick={handleDelete}
          className="w-full py-3 rounded-xl font-semibold border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete Item
        </button>
      </div>
    </div>
  )
}
