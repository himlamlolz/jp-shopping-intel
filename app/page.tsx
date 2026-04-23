'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingBag, Eye, DollarSign, Inbox, TrendingUp, Plus, ExternalLink } from 'lucide-react'
import { getWishlist, getDiscoveryItems, getProfile } from '@/lib/storage'
import type { WishlistItem } from '@/lib/types'

export default function DashboardPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [inboxCount, setInboxCount] = useState(0)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null)
  const [preferredCurrency, setPreferredCurrency] = useState('JPY')

  useEffect(() => {
    setItems(getWishlist())
    setInboxCount(getDiscoveryItems().filter(i => i.status === 'inbox').length)
    const profile = getProfile()
    setPreferredCurrency(profile.preferredCurrency)
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then((data: { rates?: Record<string, number> }) => {
        if (data.rates) setExchangeRates(data.rates)
      })
      .catch(() => {})
  }, [])

  const totalValue = items.reduce((sum, i) => sum + i.price, 0)
  const watchingCount = items.filter(i => i.status === 'watching').length

  const totalValueDisplay = (() => {
    const jpy = `¥${totalValue.toLocaleString()}`
    if (!exchangeRates || preferredCurrency === 'JPY') return jpy
    const rate = exchangeRates[preferredCurrency]
    if (!rate) return jpy
    const converted = Math.round(totalValue * rate).toLocaleString()
    return `${jpy} / ${preferredCurrency} ${converted}`
  })()

  const stats = [
    { label: 'Total Items', value: items.length, icon: ShoppingBag, colorBg: 'bg-indigo-50 dark:bg-indigo-900/30', colorText: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Watching', value: watchingCount, icon: Eye, colorBg: 'bg-amber-50 dark:bg-amber-900/30', colorText: 'text-amber-600 dark:text-amber-400' },
    { label: 'Total Value (JPY)', value: totalValueDisplay, icon: DollarSign, colorBg: 'bg-emerald-50 dark:bg-emerald-900/30', colorText: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Discovery Inbox', value: inboxCount, icon: Inbox, colorBg: 'bg-purple-50 dark:bg-purple-900/30', colorText: 'text-purple-600 dark:text-purple-400' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your Japanese shopping intelligence overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${stat.colorBg} mb-2`}>
              <stat.icon className={`w-5 h-5 ${stat.colorText}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Wishlist Items</h2>
          <Link href="/wishlist" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">View all →</Link>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No items yet</p>
            <Link href="/add" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Add your first item
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.slice(0, 5).map(item => (
              <Link key={item.id} href={`/wishlist/${item.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    {item.title}
                    {item.sourceUrl && (
                      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </p>
                  {item.titleJa && <p className="text-sm text-gray-500">{item.titleJa}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">¥{item.price.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ['arrived','purchased'].includes(item.status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    ['watching','bid_placed'].includes(item.status) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>{item.status.replace('_',' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { href: '/add', icon: '➕', label: 'Add Item' },
          { href: '/scan', icon: '📷', label: 'Scan' },
          { href: '/calculator', icon: '🧮', label: 'Calculator' },
          { href: '/discovery', icon: '🔍', label: 'Discovery' },
          { href: '/analytics', icon: '📊', label: 'Analytics' },
          { href: '/calendar', icon: '📅', label: 'Calendar' },
          { href: '/settings', icon: '⚙️', label: 'Settings' },
        ].map(action => (
          <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all text-center">
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
