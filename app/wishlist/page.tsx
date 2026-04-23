'use client'
import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getWishlist, updateWishlistItem, deleteWishlistItem } from '@/lib/storage'
import type { WishlistItem } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  watching: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  bid_placed: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  purchased: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  arrived: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  passed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const STATUSES: WishlistItem['status'][] = ['watching', 'bid_placed', 'purchased', 'arrived', 'passed']
const PLATFORMS: Array<WishlistItem['sourcePlatform'] | 'all'> = ['all', 'mercari', 'yahoo_auctions', 'surugaya', 'melonbooks', 'toranoana', 'amazon_jp', 'other']

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date')

  useEffect(() => {
    setItems(getWishlist())
  }, [])

  const refresh = () => setItems(getWishlist())

  const handleStatusChange = (id: string, status: WishlistItem['status']) => {
    updateWishlistItem(id, { status })
    refresh()
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this item?')) {
      deleteWishlistItem(id)
      refresh()
    }
  }

  const filtered = items
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .filter(i => filterPlatform === 'all' || i.sourcePlatform === filterPlatform)
    .filter(i => search === '' || i.title.toLowerCase().includes(search.toLowerCase()) || (i.titleJa ?? '').includes(search))
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price
      if (sortBy === 'price_desc') return b.price - a.price
      if (sortBy === 'priority') {
        const p: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Wishlist ({items.length})</h1>
        <Link href="/add" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Item
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
          {PLATFORMS.map(p => <option key={p} value={p}>{p === 'all' ? 'All Platforms' : p.replace('_',' ')}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
          <option value="date">Newest First</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No items found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title}</p>
                  {item.titleJa && <p className="text-sm text-gray-500 truncate">{item.titleJa}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">¥{item.price.toLocaleString()}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.priority === 'high' ? 'bg-red-100 text-red-700' : item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {item.priority}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {item.sourcePlatform.replace('_',' ')}
                </span>
                <select
                  value={item.status}
                  onChange={e => handleStatusChange(item.id, e.target.value as WishlistItem['status'])}
                  className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer ${STATUS_COLORS[item.status]}`}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
