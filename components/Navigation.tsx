'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X, Sun, Moon, Monitor } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from './ThemeProvider'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/add', label: 'Add Item' },
  { href: '/scan', label: 'Scan' },
  { href: '/calculator', label: 'Calculator' },
  { href: '/discovery', label: 'Discovery' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/settings', label: 'Settings' },
]

const SCHEME_CYCLE = ['light', 'dark', 'system'] as const

export default function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scheme, setScheme } = useTheme()

  const cycleTheme = () => {
    const idx = SCHEME_CYCLE.indexOf(scheme)
    setScheme(SCHEME_CYCLE[(idx + 1) % SCHEME_CYCLE.length])
  }

  const ThemeIcon = scheme === 'dark' ? Moon : scheme === 'light' ? Sun : Monitor

  return (
    <nav className="bg-indigo-900 dark:bg-indigo-950 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <ShoppingBag className="w-6 h-6 text-indigo-300" />
            <span className="hidden sm:block">JP Shopping Intel</span>
            <span className="sm:hidden">JP Intel</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 flex-wrap justify-end">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={cycleTheme}
              title={`Theme: ${scheme}`}
              className="p-2 rounded-md text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={cycleTheme}
              title={`Theme: ${scheme}`}
              className="p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-800"
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-800"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === link.href
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
