'use client'
import { useEffect, useState } from 'react'
import { Calculator, ChevronDown } from 'lucide-react'
import { getProfile, getWishlist } from '@/lib/storage'
import { PROXY_SERVICE_PRESETS, type WishlistItem } from '@/lib/types'

const APPROX_RATES: Record<string, number> = {
  USD: 1 / 150,
  EUR: 1 / 160,
  GBP: 1 / 190,
}

export default function CalculatorPage() {
  const [itemPrice, setItemPrice] = useState(0)
  const [domesticShipping, setDomesticShipping] = useState(500)
  const [proxyFixed, setProxyFixed] = useState(300)
  const [proxyPct, setProxyPct] = useState(0.05)
  const [intlShipping, setIntlShipping] = useState(2000)
  const [paymentPct, setPaymentPct] = useState(0.036)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [currency, setCurrency] = useState('USD')
  const [selectedPreset, setSelectedPreset] = useState('Buyee')

  // Budget simulator state
  const [watchingItems, setWatchingItems] = useState<WishlistItem[]>([])
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [simProxyFee, setSimProxyFee] = useState(300)
  const [simIntlShipping, setSimIntlShipping] = useState(2000)
  const [simCurrency, setSimCurrency] = useState('USD')

  useEffect(() => {
    const profile = getProfile()
    setCurrency(profile.preferredCurrency)
    setIntlShipping(profile.internationalShippingEstimate)
    setSimIntlShipping(profile.internationalShippingEstimate)
    setSimProxyFee(profile.proxyServiceFee)
    setSimCurrency(profile.preferredCurrency)

    const preset = PROXY_SERVICE_PRESETS.find(p => p.name === 'Buyee')
    if (preset) { setProxyFixed(preset.fixedFee); setProxyPct(preset.percentageFee) }

    const watching = getWishlist().filter(i => i.status === 'watching')
    setWatchingItems(watching)
    setCheckedItems(new Set(watching.map(i => i.id)))

    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then((d: { rates: Record<string, number> }) => {
        const rate = d.rates?.[profile.preferredCurrency]
        if (rate) setExchangeRate(rate)
      })
      .catch(() => {})
  }, [])

  const proxyFee = proxyFixed + Math.round(itemPrice * proxyPct)
  const paymentFee = Math.round(itemPrice * paymentPct)
  const subtotal = itemPrice + domesticShipping + proxyFee + intlShipping + paymentFee
  const converted = exchangeRate ? (subtotal * exchangeRate).toFixed(2) : null

  const handlePreset = (name: string) => {
    setSelectedPreset(name)
    const preset = PROXY_SERVICE_PRESETS.find(p => p.name === name)
    if (preset) { setProxyFixed(preset.fixedFee); setProxyPct(preset.percentageFee) }
  }

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const checkedList = watchingItems.filter(i => checkedItems.has(i.id))
  const simItemsTotal = checkedList.reduce((sum, i) => sum + i.price, 0)
  const simProxyTotal = simProxyFee * checkedList.length
  const simShipping = checkedList.length > 0 ? simIntlShipping : 0
  const simTotal = simItemsTotal + simProxyTotal + simShipping
  const approxRate = APPROX_RATES[simCurrency]
  const simConverted = approxRate ? (simTotal * approxRate).toFixed(2) : null

  const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <div className={`flex justify-between py-2 ${highlight ? 'font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700' : 'text-gray-600 dark:text-gray-400'}`}>
      <span>{label}</span>
      <span className={highlight ? 'text-indigo-600 dark:text-indigo-400' : ''}>{value}</span>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 mb-6">
        <Calculator className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        Landed Cost Calculator
      </h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          Inputs <ChevronDown className="w-4 h-4" />
        </h2>
        <div className="space-y-4">
          {[
            { label: 'Item Price (JPY)', value: itemPrice, setter: setItemPrice },
            { label: 'Domestic Japan Shipping (JPY)', value: domesticShipping, setter: setDomesticShipping },
            { label: 'International Shipping Estimate (JPY)', value: intlShipping, setter: setIntlShipping },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input
                type="number"
                value={f.value || ''}
                onChange={e => f.setter(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proxy Service</label>
            <div className="flex flex-wrap gap-2">
              {PROXY_SERVICE_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset.name)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedPreset === preset.name ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Fixed Fee (JPY)</label>
                <input type="number" value={proxyFixed} onChange={e => { setSelectedPreset('Custom'); setProxyFixed(parseInt(e.target.value)||0) }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 mt-0.5" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">% Fee</label>
                <input type="number" step="0.01" value={(proxyPct * 100).toFixed(0)} onChange={e => { setSelectedPreset('Custom'); setProxyPct((parseInt(e.target.value)||0)/100) }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 mt-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Breakdown</h2>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <Row label="Item Price" value={`¥${itemPrice.toLocaleString()}`} />
          <Row label="Domestic Shipping" value={`¥${domesticShipping.toLocaleString()}`} />
          <Row label={`Proxy Fee (${proxyFixed > 0 ? `¥${proxyFixed}+` : ''}${(proxyPct*100).toFixed(0)}%)`} value={`¥${proxyFee.toLocaleString()}`} />
          <Row label="International Shipping (est.)" value={`¥${intlShipping.toLocaleString()}`} />
          <Row label={`Payment Processing (${(paymentPct*100).toFixed(1)}%)`} value={`¥${paymentFee.toLocaleString()}`} />
          <Row label="Total (JPY)" value={`¥${subtotal.toLocaleString()}`} highlight />
          {converted && <Row label={`Total (${currency})`} value={`${currency} ${converted}`} highlight />}
        </div>
        {!exchangeRate && <p className="text-xs text-gray-400 mt-3">Set your preferred currency in Settings to see converted totals.</p>}
      </div>

      {/* Feature 5: Budget Simulator */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Simulator</h2>
        {watchingItems.length === 0 ? (
          <p className="text-sm text-gray-400">No watching items in your wishlist.</p>
        ) : (
          <>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {watchingItems.map(item => {
                const isChecked = checkedItems.has(item.id)
                const overCeiling = item.priceCeiling && item.price > item.priceCeiling
                return (
                  <label key={item.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(item.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className={`flex-1 text-sm truncate ${overCeiling && isChecked ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {overCeiling && isChecked && <span className="mr-1">⚠️</span>}
                      {item.title}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">¥{item.price.toLocaleString()}</span>
                  </label>
                )
              })}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Items total ({checkedList.length} items)</span>
                <span>¥{simItemsTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Proxy fee (¥{simProxyFee} × {checkedList.length})</span>
                <span>¥{simProxyTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Intl. shipping (flat)</span>
                <span>¥{simShipping.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span>Total (JPY)</span>
                <span className="text-indigo-600 dark:text-indigo-400">¥{simTotal.toLocaleString()}</span>
              </div>
              {simConverted && (
                <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100">
                  <span>Total ({simCurrency})</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{simCurrency} {simConverted}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Approximate rate — for reference only</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

