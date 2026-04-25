'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink } from 'lucide-react'
import { getWishlist, getProfile } from '@/lib/storage'
import type { WishlistItem } from '@/lib/types'
import type { GscRssItem } from '@/app/api/gscrss/route'

export default function CalendarPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [gscItems, setGscItems] = useState<GscRssItem[]>([])
  const [gscLoading, setGscLoading] = useState(false)
  const [gscError, setGscError] = useState<string | null>(null)
  const [showAllGsc, setShowAllGsc] = useState(false)

  useEffect(() => {
    setItems(getWishlist())

    // Feature 2: Fetch GSC releases
    setGscLoading(true)
    fetch('/api/gscrss')
      .then(r => r.json())
      .then((d: { items: GscRssItem[]; error?: string }) => {
        if (d.error) setGscError(d.error)
        setGscItems(d.items ?? [])
      })
      .catch(err => setGscError(String(err)))
      .finally(() => setGscLoading(false))
  }, [])

  const { year, month } = current

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrent(c => {
    if (c.month === 0) return { year: c.year - 1, month: 11 }
    return { year: c.year, month: c.month - 1 }
  })
  const nextMonth = () => setCurrent(c => {
    if (c.month === 11) return { year: c.year + 1, month: 0 }
    return { year: c.year, month: c.month + 1 }
  })

  // Build day → events map
  type CalEvent = { id: string; title: string; type: 'arrived' | 'release' }
  const eventMap = new Map<string, CalEvent[]>()
  const addEvent = (date: Date, ev: CalEvent) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    if (!eventMap.has(key)) eventMap.set(key, [])
    eventMap.get(key)!.push(ev)
  }

  for (const item of items) {
    if (item.status === 'arrived') {
      addEvent(new Date(item.updatedAt), { id: item.id, title: item.title, type: 'arrived' })
    }
    if (item.releaseDate) {
      addEvent(new Date(item.releaseDate), { id: item.id, title: item.title, type: 'release' })
    }
  }

  const getKey = (day: number) => `${year}-${month}-${day}`

  // Upcoming releases (future, sorted ascending)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = items
    .filter(i => i.releaseDate && new Date(i.releaseDate) >= today)
    .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime())
    .slice(0, 10)

  // Calendar grid cells: blank pads + day numbers
  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const todayNow = new Date()
  const todayDay = (todayNow.getFullYear() === year && todayNow.getMonth() === month)
    ? todayNow.getDate()
    : -1

  // Feature 2: Match GSC items against user keywords
  const keywords = getProfile().keywords
  const matchGsc = (item: GscRssItem) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase()
    return keywords.some(kw =>
      (kw.en && haystack.includes(kw.en.toLowerCase())) ||
      (kw.ja && haystack.includes(kw.ja.toLowerCase()))
    )
  }
  const matchedGsc = gscItems.filter(matchGsc)
  const displayGsc = showAllGsc ? gscItems : matchedGsc

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Release &amp; Arrival Calendar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track release dates and when items arrived.
        </p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Calendar */}
        <div className="flex-1">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {cells.map((day, idx) => {
              const events = day ? (eventMap.get(getKey(day)) ?? []) : []
              const isToday = day !== null && day === todayDay
              return (
                <div key={idx} className={`min-h-16 p-1 ${day === null ? 'bg-gray-50 dark:bg-gray-900/40' : 'bg-white dark:bg-gray-900'}`}>
                  {day !== null && (
                    <>
                      <span className={`text-xs font-medium block text-right mb-0.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {events.slice(0, 3).map((ev, ei) => (
                          <Link key={ei} href={`/wishlist/${ev.id}`}
                            className={`block text-[10px] px-1 rounded truncate font-medium leading-4 ${
                              ev.type === 'arrived'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                            }`}
                            title={ev.title}>
                            {ev.title}
                          </Link>
                        ))}
                        {events.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{events.length - 3}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Arrived
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" /> Release date
            </span>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:w-64 shrink-0 space-y-6">
          {/* Upcoming releases */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Upcoming Releases</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming release dates set.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(item => (
                  <Link key={item.id} href={`/wishlist/${item.id}`}
                    className="block p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                    <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-0.5">
                      {new Date(item.releaseDate!).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{item.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Feature 2: GSC Releases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">GSC Releases</h3>
              {gscItems.length > 0 && (
                <button onClick={() => setShowAllGsc(s => !s)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  {showAllGsc ? 'Matched only' : 'Show all'}
                </button>
              )}
            </div>
            {gscLoading && <p className="text-xs text-gray-400 animate-pulse">Loading GSC releases…</p>}
            {gscError && <p className="text-xs text-red-500">Failed to load GSC feed</p>}
            {!gscLoading && !gscError && displayGsc.length === 0 && (
              <p className="text-xs text-gray-400">No matched releases found.</p>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {displayGsc.map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="block p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 mb-0.5 flex items-center gap-1">
                    {item.pubDate ? new Date(item.pubDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{item.title}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

