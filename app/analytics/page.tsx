'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { getWishlist, getProfile } from '@/lib/storage'
import type { WishlistItem } from '@/lib/types'

function formatJpy(n: number) {
  return `¥${n.toLocaleString()}`
}

interface BarChartRowProps {
  label: string
  value: number
  count: number
  max: number
  color: string
}

function BarChartRow({ label, value, count, max, color }: BarChartRowProps) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-gray-700 dark:text-gray-300 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right text-gray-500 dark:text-gray-400 shrink-0">{formatJpy(value)} ({count})</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [preferredCurrency, setPreferredCurrency] = useState('JPY')

  useEffect(() => {
    setItems(getWishlist())
    const profile = getProfile()
    setPreferredCurrency(profile.preferredCurrency)
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then((d: { rates?: Record<string, number> }) => { if (d.rates) setRates(d.rates) })
      .catch(() => {})
  }, [])

  const spent = items.filter(i => i.status === 'purchased' || i.status === 'arrived')
  const totalSpend = spent.reduce((s, i) => s + i.price, 0)
  const largest = spent.length ? Math.max(...spent.map(i => i.price)) : 0
  const platformCounts = spent.reduce<Record<string, number>>((acc, i) => { acc[i.sourcePlatform] = (acc[i.sourcePlatform] ?? 0) + 1; return acc }, {})
  const mostActivePlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const convertedTotal = (() => {
    if (!rates || preferredCurrency === 'JPY') return null
    const rate = rates[preferredCurrency]
    if (!rate) return null
    return `${preferredCurrency} ${Math.round(totalSpend * rate).toLocaleString()}`
  })()

  // Spend by status
  const STATUS_COLORS: Record<string, string> = {
    watching: 'bg-amber-400',
    bid_placed: 'bg-orange-400',
    purchased: 'bg-blue-500',
    arrived: 'bg-green-500',
    passed: 'bg-gray-400',
  }
  const statusGroups = (['watching','bid_placed','purchased','arrived','passed'] as WishlistItem['status'][]).map(s => {
    const grp = items.filter(i => i.status === s)
    return { label: s.replace('_', ' '), value: grp.reduce((a, i) => a + i.price, 0), count: grp.length, color: STATUS_COLORS[s] }
  })
  const statusMax = Math.max(...statusGroups.map(g => g.value), 1)

  // Spend by platform (top 6)
  const platformMap = new Map<string, { value: number; count: number }>()
  for (const i of spent) {
    const prev = platformMap.get(i.sourcePlatform) ?? { value: 0, count: 0 }
    platformMap.set(i.sourcePlatform, { value: prev.value + i.price, count: prev.count + 1 })
  }
  const platformGroups = Array.from(platformMap.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 6)
    .map(([label, g]) => ({ label, value: g.value, count: g.count }))
  const platformMax = Math.max(...platformGroups.map(g => g.value), 1)

  // Spend by tag (top 8)
  const tagMap = new Map<string, { value: number; count: number }>()
  for (const i of spent) {
    for (const tag of i.tags) {
      const prev = tagMap.get(tag) ?? { value: 0, count: 0 }
      tagMap.set(tag, { value: prev.value + i.price, count: prev.count + 1 })
    }
  }
  const tagGroups = Array.from(tagMap.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 8)
    .map(([label, g]) => ({ label, value: g.value, count: g.count }))
  const tagMax = Math.max(...tagGroups.map(g => g.value), 1)

  // Monthly spend (last 12 months)
  const now = new Date()
  const months: { label: string; value: number }[] = []
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
    const value = spent
      .filter(i => {
        const cd = new Date(i.createdAt)
        return `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}` === key
      })
      .reduce((s, i) => s + i.price, 0)
    months.push({ label, value })
  }
  const monthMax = Math.max(...months.map(m => m.value), 1)

  // Price ceiling hits (watching items under ceiling)
  const ceilingHits = items.filter(i => i.status === 'watching' && i.priceCeiling != null && i.price <= i.priceCeiling)

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <BarChart2 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">No data yet — add some wishlist items to see your spending analytics.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <BarChart2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Spending insights from your wishlist</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tracked', value: items.length.toString() },
          { label: 'Total Spend', value: `${formatJpy(totalSpend)}${convertedTotal ? ` / ${convertedTotal}` : ''}` },
          { label: 'Largest Purchase', value: formatJpy(largest) },
          { label: 'Most Active Platform', value: mostActivePlatform.replace('_',' ') },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Spend by status */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Spend by Status</h2>
          <div className="space-y-3">
            {statusGroups.map(g => (
              <BarChartRow key={g.label} label={g.label} value={g.value} count={g.count} max={statusMax} color={g.color} />
            ))}
          </div>
        </section>

        {/* Spend by platform */}
        {platformGroups.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Spend by Platform (purchased + arrived)</h2>
            <div className="space-y-3">
              {platformGroups.map(g => (
                <BarChartRow key={g.label} label={g.label.replace('_',' ')} value={g.value} count={g.count} max={platformMax} color="bg-indigo-500" />
              ))}
            </div>
          </section>
        )}

        {/* Spend by tag */}
        {tagGroups.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Spend by Tag (purchased + arrived)</h2>
            <div className="space-y-3">
              {tagGroups.map(g => (
                <BarChartRow key={g.label} label={g.label} value={g.value} count={g.count} max={tagMax} color="bg-purple-500" />
              ))}
            </div>
          </section>
        )}

        {/* Monthly spend */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Monthly Spend (last 12 months)</h2>
          <div className="flex items-end gap-1 h-32">
            {months.map(m => {
              const pct = monthMax > 0 ? (m.value / monthMax) * 100 : 0
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t relative" style={{ height: '100px' }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center">{m.label}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Price ceiling hits */}
        {ceilingHits.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">🎯 Price Ceiling Hits — Deals Board</h2>
            <div className="space-y-2">
              {ceilingHits.map(i => (
                <div key={i.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate max-w-xs">{i.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Price: {formatJpy(i.price)} · Ceiling: {formatJpy(i.priceCeiling!)}
                    </p>
                  </div>
                  <Link href={`/wishlist/${i.id}`}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shrink-0">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
