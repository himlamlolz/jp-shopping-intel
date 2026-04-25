'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getDiscoveryItems, updateDiscoveryItem, addWishlistItem } from '@/lib/storage'
import type { DiscoveryItem } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

const SHORTCUTS = [
  { keys: '/', description: 'Focus search input' },
  { keys: '?', description: 'Show this help' },
  { keys: 'A (on /discovery)', description: 'Add first inbox item to wishlist' },
  { keys: 'D (on /discovery)', description: 'Dismiss first inbox item' },
  { keys: 'S (on /discovery)', description: 'Snooze first inbox item' },
  { keys: 'N (on /wishlist)', description: 'Navigate to /add' },
]

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setShowHelp(s => !s)
        return
      }

      if (e.key === 'Escape') {
        setShowHelp(false)
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')
        input?.focus()
        return
      }

      if (pathname === '/discovery') {
        if (e.key === 'a' || e.key === 'A') {
          const items = getDiscoveryItems().filter((i: DiscoveryItem) => i.status === 'inbox')
          const first = items[0]
          if (first) {
            addWishlistItem({
              id: uuidv4(),
              title: first.suggestedTitle ?? 'Untitled',
              price: first.suggestedPrice ?? 0,
              currency: 'JPY',
              sourcePlatform: 'other',
              status: 'watching',
              priority: 'medium',
              tags: first.suggestedTags ?? [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            updateDiscoveryItem(first.id, { status: 'added_to_wishlist' })
          }
        } else if (e.key === 'd' || e.key === 'D') {
          const items = getDiscoveryItems().filter((i: DiscoveryItem) => i.status === 'inbox')
          const first = items[0]
          if (first) updateDiscoveryItem(first.id, { status: 'dismissed' })
        } else if (e.key === 's' || e.key === 'S') {
          const items = getDiscoveryItems().filter((i: DiscoveryItem) => i.status === 'inbox')
          const first = items[0]
          if (first) updateDiscoveryItem(first.id, { snoozedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'snoozed' })
        }
      }

      if (pathname === '/wishlist') {
        if (e.key === 'n' || e.key === 'N') {
          router.push('/add')
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [pathname, router])

  if (!showHelp) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Keyboard Shortcuts</h2>
        <ul className="space-y-2">
          {SHORTCUTS.map(s => (
            <li key={s.keys} className="flex items-start gap-3">
              <kbd className="shrink-0 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono border border-gray-300 dark:border-gray-600">
                {s.keys}
              </kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">{s.description}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-4">Press Esc or click outside to close</p>
      </div>
    </div>
  )
}
