'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getColorScheme, setColorScheme } from '@/lib/storage'

type ColorScheme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  scheme: ColorScheme
  setScheme: (s: ColorScheme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: 'system',
  setScheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function applyScheme(scheme: ColorScheme) {
  const root = document.documentElement
  if (scheme === 'dark') {
    root.classList.add('dark')
  } else if (scheme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>('system')

  useEffect(() => {
    const stored = getColorScheme()
    setSchemeState(stored)
    applyScheme(stored)
  }, [])

  useEffect(() => {
    if (scheme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyScheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [scheme])

  const handleSetScheme = (s: ColorScheme) => {
    setColorScheme(s)
    setSchemeState(s)
    applyScheme(s)
  }

  return (
    <ThemeContext.Provider value={{ scheme, setScheme: handleSetScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
