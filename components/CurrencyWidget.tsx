'use client'
import { useEffect, useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { getProfile } from '@/lib/storage'

const CURRENCIES = ['JPY', 'USD', 'HKD', 'TWD', 'SGD', 'EUR', 'GBP', 'AUD', 'CAD', 'KRW', 'CNY']
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW'])

export default function CurrencyWidget() {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(1000)
  const [from, setFrom] = useState('JPY')
  const [to, setTo] = useState('USD')
  // rates are always relative to JPY (from=JPY)
  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [ratesError, setRatesError] = useState(false)

  useEffect(() => {
    const pref = getProfile().preferredCurrency
    if (CURRENCIES.includes(pref) && pref !== 'JPY') setTo(pref)
  }, [])

  useEffect(() => {
    if (!open || rates !== null || ratesError) return
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then((data: { rates?: Record<string, number>; error?: string }) => {
        if (data.rates) setRates(data.rates)
        else setRatesError(true)
      })
      .catch(() => setRatesError(true))
  }, [open, rates, ratesError])

  const convert = (amt: number, f: string, t: string): number | null => {
    if (!rates) return null
    if (f === t) return amt
    // all rates are JPY → X
    if (f === 'JPY') {
      const rate = rates[t]
      return rate ? amt * rate : null
    }
    if (t === 'JPY') {
      const rate = rates[f]
      return rate ? amt / rate : null
    }
    const fromRate = rates[f]
    const toRate = rates[t]
    if (!fromRate || !toRate) return null
    return (amt / fromRate) * toRate
  }

  const result = convert(amount, from, to)

  const fmt = (val: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2 }).format(val)
    } catch {
      return `${val.toFixed(2)} ${currency}`
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="absolute bottom-16 right-0 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Currency Converter</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />

            <div className="flex items-center gap-2">
              <select value={from} onChange={e => setFrom(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => { setFrom(to); setTo(from) }}
                className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ArrowLeftRight className="w-4 h-4" />
              </button>
              <select value={to} onChange={e => setTo(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
              {ratesError ? (
                <p className="text-sm text-gray-400">Rates unavailable</p>
              ) : result === null ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {fmt(amount, from)} = {fmt(result, to)}
                </p>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center mt-1">Rates from Frankfurter</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Currency converter"
      >
        <ArrowLeftRight className="w-6 h-6" />
      </button>
    </div>
  )
}
