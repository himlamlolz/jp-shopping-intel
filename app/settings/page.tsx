'use client'
import { useEffect, useRef, useState } from 'react'
import { Settings, Plus, X, Check, AlertCircle, Download, Upload } from 'lucide-react'
import { getProfile, saveProfile, getVisionApiKey, setVisionApiKey, getWishlist, saveWishlist, getDiscoveryItems, saveDiscoveryItems, mergeWishlist, mergeProfile, mergeDiscoveryItems, exportWishlistJson, exportWishlistCsv } from '@/lib/storage'
import { PROXY_SERVICE_PRESETS, type InterestProfile, type WishlistItem, type DiscoveryItem } from '@/lib/types'

const CURRENCIES = ['USD','HKD','TWD','SGD','EUR','GBP','AUD','CAD','KRW','CNY']

export default function SettingsPage() {
  const [profile, setProfile] = useState<InterestProfile | null>(null)
  const [visionKey, setVisionKeyState] = useState('')
  const [keyStatus, setKeyStatus] = useState<'idle'|'testing'|'ok'|'fail'>('idle')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [newEnKw, setNewEnKw] = useState('')
  const [newJaKw, setNewJaKw] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('Buyee')
  const [importStatus, setImportStatus] = useState<'idle'|'ok'|'merge_ok'|'fail'>('idle')
  const [importMode, setImportMode] = useState<'overwrite'|'merge'>('overwrite')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setProfile(getProfile())
    setVisionKeyState(getVisionApiKey())
  }, [])

  if (!profile) return null

  const update = (updates: Partial<InterestProfile>) => setProfile(p => p ? { ...p, ...updates } : p)

  const handleSave = () => {
    saveProfile(profile)
    setVisionApiKey(visionKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addKeyword = () => {
    if (!newEnKw && !newJaKw) return
    update({ keywords: [...profile.keywords, { en: newEnKw || undefined, ja: newJaKw || undefined }] })
    setNewEnKw(''); setNewJaKw('')
  }

  const removeKeyword = (idx: number) => update({ keywords: profile.keywords.filter((_,i) => i !== idx) })

  const handlePreset = (name: string) => {
    setSelectedPreset(name)
    const preset = PROXY_SERVICE_PRESETS.find(p => p.name === name)
    if (preset) update({ proxyServiceFee: preset.fixedFee })
  }

  const testVisionKey = async () => {
    setKeyStatus('testing')
    setKeyError(null)
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-vision-api-key': visionKey },
        body: JSON.stringify({ imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mode: 'screenshot' }),
      })
      if (res.ok) {
        setKeyStatus('ok')
      } else {
        let msg: string
        try {
          const body = await res.json() as { error?: string; code?: number; status?: string }
          const { error: rawError, code, status } = body
          if (status === 'PERMISSION_DENIED' || code === 403) {
            msg = 'Key not valid or Cloud Vision API not enabled for this project'
          } else if (status === 'RESOURCE_EXHAUSTED' || code === 429) {
            msg = 'Quota exceeded — free tier limit reached'
          } else if (status === 'INVALID_ARGUMENT' || code === 400) {
            msg = 'Invalid API key format'
          } else {
            msg = rawError ?? 'Unknown error'
            if (status) msg += ` (${status})`
          }
        } catch {
          msg = 'Unexpected response from server'
        }
        setKeyError(msg)
        setKeyStatus('fail')
      }
    } catch { setKeyStatus('fail') }
  }

  const handleExport = () => {
    const data = {
      wishlist: getWishlist(),
      profile: getProfile(),
      discoveryItems: getDiscoveryItems(),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jp-shopping-intel-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as {
          wishlist?: WishlistItem[]; profile?: InterestProfile; discoveryItems?: DiscoveryItem[]
        }
        if (importMode === 'merge') {
          if (data.wishlist) mergeWishlist(data.wishlist)
          if (data.profile) { mergeProfile(data.profile); setProfile(p => p ? { ...p, ...data.profile } : p) }
          if (data.discoveryItems) mergeDiscoveryItems(data.discoveryItems)
          setImportStatus('merge_ok')
        } else {
          if (data.wishlist) saveWishlist(data.wishlist as Parameters<typeof saveWishlist>[0])
          if (data.profile) { saveProfile(data.profile); setProfile(data.profile) }
          if (data.discoveryItems) saveDiscoveryItems(data.discoveryItems as Parameters<typeof saveDiscoveryItems>[0])
          setImportStatus('ok')
        }
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch {
        setImportStatus('fail')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
    // reset so same file can be re-imported
    e.target.value = ''
  }

  // Live preview of Twitter search URLs
  const twitterUrls = profile.keywords.slice(0, 3).map(kw => {
    const term = kw.ja ?? kw.en ?? ''
    return { label: `${kw.en ?? kw.ja} — 新商品`, url: `https://twitter.com/search?q=${encodeURIComponent(term + ' 新商品')}&src=typed_query&f=live` }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        Settings
      </h1>

      <div className="space-y-6">
        {/* Currency */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Preferred Currency</h2>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => update({ preferredCurrency: c })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${profile.preferredCurrency === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
                {c}
              </button>
            ))}
          </div>
        </section>

        {/* Proxy */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Proxy Service</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {PROXY_SERVICE_PRESETS.map(p => (
              <button key={p.name} onClick={() => handlePreset(p.name)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedPreset === p.name ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
                {p.name}
              </button>
            ))}
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">International Shipping Estimate (JPY)</label>
            <input type="number" value={profile.internationalShippingEstimate} onChange={e => update({ internationalShippingEstimate: parseInt(e.target.value)||0 })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
          </div>
        </section>

        {/* Keywords */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Interest Keywords</h2>
          <div className="space-y-2 mb-4">
            {profile.keywords.map((kw, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="flex-1 text-sm">{kw.en && <span className="text-gray-900 dark:text-gray-100">{kw.en}</span>}{kw.en && kw.ja && <span className="text-gray-400 mx-1">/</span>}{kw.ja && <span className="text-indigo-600 dark:text-indigo-400">{kw.ja}</span>}</span>
                <button onClick={() => removeKeyword(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input placeholder="English" value={newEnKw} onChange={e => setNewEnKw(e.target.value)} onKeyDown={e => e.key==='Enter' && addKeyword()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
            <input placeholder="日本語" value={newJaKw} onChange={e => setNewJaKw(e.target.value)} onKeyDown={e => e.key==='Enter' && addKeyword()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
            <button onClick={addKeyword} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {twitterUrls.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Preview Twitter/X search URLs:</p>
              <div className="space-y-1">
                {twitterUrls.map((u,i) => (
                  <a key={i} href={u.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate">{u.label}</a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Vision API */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Google Vision API Key</h2>
          <p className="text-xs text-gray-500 mb-4">Stored on this device only — never uploaded to any server.</p>
          <div className="flex gap-2">
            <input type="password" value={visionKey} onChange={e => { setVisionKeyState(e.target.value); setKeyStatus('idle'); setKeyError(null) }}
              placeholder="AIza..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm font-mono" />
            <button onClick={testVisionKey} disabled={!visionKey || keyStatus==='testing'}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">
              {keyStatus==='testing' ? '...' : 'Test'}
            </button>
          </div>
          {keyStatus === 'ok' && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> API key valid</p>}
          {keyStatus === 'fail' && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {keyError ?? 'API key invalid or quota exceeded'}</p>
          )}
        </section>

        <button onClick={handleSave} className={`w-full py-3 rounded-xl font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>

        {/* Data Management */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Data &amp; Backup</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Export all data as a full JSON backup.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleExport}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" /> Export Full Backup JSON
                </button>
                <button onClick={() => {
                  const blob = new Blob([exportWishlistJson()], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `jp-shopping-intel-wishlist-${new Date().toISOString().slice(0,10)}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" /> Export Wishlist JSON
                </button>
                <button onClick={() => {
                  const blob = new Blob([exportWishlistCsv()], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `jp-shopping-intel-wishlist-${new Date().toISOString().slice(0,10)}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" /> Export Wishlist CSV
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">⚠️ Import (Overwrite) will replace your current data.</p>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setImportMode('overwrite'); importRef.current?.click() }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
                  <Upload className="w-4 h-4" /> Import (Overwrite)
                </button>
                <button onClick={() => { setImportMode('merge'); importRef.current?.click() }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-sm font-medium transition-colors">
                  <Upload className="w-4 h-4" /> Import (Merge)
                </button>
              </div>
              {importStatus === 'ok' && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Data imported successfully</p>}
              {importStatus === 'merge_ok' && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Data merged — duplicates preserved, new items added.</p>}
              {importStatus === 'fail' && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Import failed — invalid file</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
