'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Link2, Image as ImageIcon, Camera, PenLine, Check, Loader2 } from 'lucide-react'
import { addWishlistItem, addDiscoveryItem, getProfile, getVisionApiKey } from '@/lib/storage'
import { detectPlatform, generateJanSearchLinks, type WishlistItem, type DiscoveryItem } from '@/lib/types'
import { extractFromOcrText, imageFileToBase64 } from '@/lib/ocr-utils'

type Mode = 'url' | 'screenshot' | 'camera' | 'manual'
type CameraPhase = 'capture' | 'processing' | 'results'

const STATUSES: WishlistItem['status'][] = ['watching', 'bid_placed', 'purchased', 'arrived', 'passed']
const PRIORITIES: WishlistItem['priority'][] = ['low', 'medium', 'high']

const defaultForm = (): Partial<WishlistItem> => ({
  title: '', titleJa: '', price: 0, currency: 'JPY',
  sourcePlatform: 'other', status: 'watching', priority: 'medium', tags: [], notes: '',
})

export default function AddPage() {
  const [mode, setMode] = useState<Mode>('manual')
  const [form, setForm] = useState<Partial<WishlistItem>>(defaultForm())
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState(false)

  // Screenshot OCR state
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, string>>({})
  const pasteAreaRef = useRef<HTMLDivElement>(null)

  // Camera state
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>('capture')
  const [cameraFile, setCameraFile] = useState<File | null>(null)
  const [janCode, setJanCode] = useState<string | null>(null)
  const [janLinks, setJanLinks] = useState<Record<string, string> | null>(null)
  const [cameraOcr, setCameraOcr] = useState<ReturnType<typeof extractFromOcrText> | null>(null)

  // URL mode
  const handleUrlPaste = () => {
    if (!url) return
    const platform = detectPlatform(url)
    setForm(f => ({ ...f, sourceUrl: url, sourcePlatform: platform }))
  }

  // Screenshot OCR
  const processScreenshot = useCallback(async (file: File) => {
    setOcrFile(file)
    setOcrLoading(true)
    try {
      // Try server-side Vision API first if key is present
      const visionKey = getVisionApiKey()
      if (visionKey) {
        const b64 = await imageFileToBase64(file)
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-vision-api-key': visionKey },
          body: JSON.stringify({ imageBase64: b64, mode: 'screenshot' }),
        })
        if (res.ok) {
          const { text } = await res.json() as { text: string }
          const profile = getProfile()
          const allKw = profile.keywords.flatMap(k => [k.en, k.ja]).filter(Boolean) as string[]
          const extracted = extractFromOcrText(text, allKw)
          applyOcr(extracted)
          setOcrLoading(false)
          return
        }
      }
      // Fall back to Tesseract.js
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['jpn', 'eng'])
      const { data } = await worker.recognize(file)
      await worker.terminate()
      const profile = getProfile()
      const allKw = profile.keywords.flatMap(k => [k.en, k.ja]).filter(Boolean) as string[]
      const extracted = extractFromOcrText(data.text, allKw)
      applyOcr(extracted)
    } finally {
      setOcrLoading(false)
    }
  }, [])

  const applyOcr = (extracted: ReturnType<typeof extractFromOcrText>) => {
    setForm(f => ({
      ...f,
      title: extracted.title ?? f.title,
      price: extracted.price ?? f.price,
      listingId: extracted.listingId ?? f.listingId,
    }))
    setOcrConfidence(Object.fromEntries(Object.entries(extracted.confidence).map(([k,v]) => [k, v as string])))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) processScreenshot(file)
  }, [processScreenshot])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (mode !== 'screenshot') return
      const file = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))?.getAsFile()
      if (file) processScreenshot(file)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [mode, processScreenshot])

  // Camera / Real world
  const processCamera = async (file: File) => {
    setCameraFile(file)
    setCameraPhase('processing')
    const profile = getProfile()
    const allKw = profile.keywords.flatMap(k => [k.en, k.ja]).filter(Boolean) as string[]

    // Barcode detection (ZXing, dynamic import)
    let detectedJan: string | null = null
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise<void>(res => { img.onload = () => res() })
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageElement(img)
      const code = result.getText()
      if (/^4\d{12}$/.test(code)) {
        detectedJan = code
        setJanCode(code)
        setJanLinks(generateJanSearchLinks(code))
      }
    } catch { /* no barcode found */ }

    // OCR via Vision API or Tesseract
    try {
      const visionKey = getVisionApiKey()
      if (visionKey) {
        const b64 = await imageFileToBase64(file)
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-vision-api-key': visionKey },
          body: JSON.stringify({ imageBase64: b64, mode: 'photo' }),
        })
        if (res.ok) {
          const { text } = await res.json() as { text: string }
          const extracted = extractFromOcrText(text, allKw)
          setCameraOcr(extracted)
          setCameraPhase('results')
          return
        }
      }
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['jpn', 'eng'])
      const { data } = await worker.recognize(file)
      await worker.terminate()
      const extracted = extractFromOcrText(data.text, allKw)
      if (!detectedJan && extracted.janCode) {
        setJanCode(extracted.janCode)
        setJanLinks(generateJanSearchLinks(extracted.janCode))
      }
      setCameraOcr(extracted)
    } catch { /* OCR failed */ }
    setCameraPhase('results')
  }

  const addToWishlistFromCamera = () => {
    const item: WishlistItem = {
      ...(form as WishlistItem),
      id: uuidv4(),
      title: cameraOcr?.title ?? form.title ?? 'Untitled',
      price: cameraOcr?.price ?? form.price ?? 0,
      currency: 'JPY',
      sourcePlatform: 'other',
      status: 'watching',
      priority: 'medium',
      tags: cameraOcr?.seriesName ? [cameraOcr.seriesName] : [],
      listingId: janCode ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      realWorldCapture: {
        janCode: janCode ?? undefined,
        ocrRawText: cameraOcr?.title,
        capturedAt: new Date(),
      },
    }
    addWishlistItem(item)
    setSaved(true)
    setTimeout(() => { setSaved(false); resetAll() }, 2000)
  }

  const saveToInbox = () => {
    const discovery: DiscoveryItem = {
      id: uuidv4(),
      sourceAccountHandle: 'camera',
      sourcePlatform: 'camera',
      extractedText: cameraOcr?.title,
      suggestedTitle: cameraOcr?.title,
      suggestedPrice: cameraOcr?.price,
      suggestedTags: cameraOcr?.seriesName ? [cameraOcr.seriesName] : [],
      generatedSearchLinks: janLinks ?? undefined,
      status: 'inbox',
      createdAt: new Date(),
      autoDismissAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    addDiscoveryItem(discovery)
    setSaved(true)
    setTimeout(() => { setSaved(false); resetAll() }, 2000)
  }

  const resetAll = () => {
    setForm(defaultForm()); setUrl(''); setOcrFile(null); setCameraFile(null)
    setJanCode(null); setJanLinks(null); setCameraOcr(null); setCameraPhase('capture')
  }

  const handleSubmit = () => {
    const item: WishlistItem = {
      ...(form as WishlistItem),
      id: uuidv4(),
      title: form.title ?? 'Untitled',
      price: form.price ?? 0,
      currency: form.currency ?? 'JPY',
      sourcePlatform: form.sourcePlatform ?? 'other',
      status: form.status ?? 'watching',
      priority: form.priority ?? 'medium',
      tags: form.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    addWishlistItem(item)
    setSaved(true)
    setTimeout(() => { setSaved(false); resetAll() }, 2000)
  }

  const TABS: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'url', label: 'URL', icon: <Link2 className="w-4 h-4" /> },
    { id: 'screenshot', label: 'Screenshot', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'camera', label: 'Camera', icon: <Camera className="w-4 h-4" /> },
    { id: 'manual', label: 'Manual', icon: <PenLine className="w-4 h-4" /> },
  ]

  const ConfidenceBadge = ({ field }: { field: string }) => {
    const c = ocrConfidence[field]
    if (!c) return null
    return <span className={`text-xs px-1.5 py-0.5 rounded ml-1 ${c === 'high' ? 'bg-green-100 text-green-700' : c === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c}</span>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Add Item</h1>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setMode(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode === tab.id ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}>
            {tab.icon} <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* URL mode */}
      {mode === 'url' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste a product URL</label>
          <div className="flex gap-2">
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://jp.mercari.com/item/..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
            <button onClick={handleUrlPaste} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Import</button>
          </div>
          {form.sourcePlatform && form.sourcePlatform !== 'other' && (
            <p className="text-sm text-emerald-600 mt-2">✓ Detected: {form.sourcePlatform.replace('_',' ')}</p>
          )}
        </div>
      )}

      {/* Screenshot OCR mode */}
      {mode === 'screenshot' && (
        <div
          ref={pasteAreaRef}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 mb-4 text-center cursor-pointer hover:border-indigo-400 transition-colors"
        >
          {ocrLoading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-gray-500">Processing OCR…</p>
            </div>
          ) : ocrFile ? (
            <p className="text-emerald-600">✓ Screenshot processed — edit fields below</p>
          ) : (
            <>
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Drag & drop or <strong>Ctrl+V</strong> to paste a screenshot</p>
              <label className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 text-sm">
                Browse
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) processScreenshot(f) }} />
              </label>
            </>
          )}
        </div>
      )}

      {/* Camera mode */}
      {mode === 'camera' && (
        <div className="mb-4 space-y-4">
          {cameraPhase === 'capture' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">Take a photo of the product or packaging</p>
              <label className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 text-sm">
                Open Camera / Upload Photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) processCamera(f) }} />
              </label>
            </div>
          )}

          {cameraPhase === 'processing' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Scanning for barcodes and extracting text…</p>
            </div>
          )}

          {cameraPhase === 'results' && (
            <div className="space-y-4">
              {/* Barcode panel */}
              {janCode && janLinks && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
                  <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">✓ JAN Barcode Found</h3>
                  <p className="font-mono text-lg text-gray-900 dark:text-gray-100 mb-3">{janCode}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(janLinks).map(([platform, searchUrl]) => (
                      <a key={platform} href={searchUrl} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm hover:bg-indigo-200 transition-colors">
                        {platform === 'amazonJp' ? 'Amazon JP' : platform === 'yahooShopping' ? 'Yahoo Shopping' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* OCR panel */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">OCR Results</h3>
                {cameraOcr?.title && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Title: <span className="text-gray-900 dark:text-gray-100">{cameraOcr.title}</span></p>}
                {cameraOcr?.price && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Price: <span className="text-gray-900 dark:text-gray-100">¥{cameraOcr.price.toLocaleString()}</span></p>}
                {cameraOcr?.manufacturer && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Manufacturer: <span className="text-gray-900 dark:text-gray-100">{cameraOcr.manufacturer}</span></p>}
                {!cameraOcr?.title && !cameraOcr?.price && <p className="text-gray-400 text-sm">No text extracted.</p>}
              </div>

              {/* Google Lens fallback */}
              <a href="https://lens.google.com/" target="_blank" rel="noopener noreferrer"
                className="block text-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-indigo-400 transition-colors">
                🔍 Get a second opinion from Google Lens
              </a>

              <div className="flex gap-3">
                <button onClick={addToWishlistFromCamera} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
                  {saved ? <Check className="w-5 h-5 mx-auto" /> : 'Add to Wishlist'}
                </button>
                <button onClick={saveToInbox} className="flex-1 py-3 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  Save to Inbox
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual form (shown for manual mode and as edit form for url/screenshot) */}
      {(mode === 'manual' || mode === 'url' || mode === 'screenshot') && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title (required) <ConfidenceBadge field="title" />
            </label>
            <input value={form.title ?? ''} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm ${ocrConfidence.title === 'low' ? 'border-amber-400' : 'border-gray-300 dark:border-gray-700'}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Japanese Title</label>
            <input value={form.titleJa ?? ''} onChange={e => setForm(f => ({...f, titleJa: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (JPY) <ConfidenceBadge field="price" />
              </label>
              <input type="number" value={form.price ?? ''} onChange={e => setForm(f => ({...f, price: parseInt(e.target.value)||0}))}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm ${ocrConfidence.price === 'low' ? 'border-amber-400' : 'border-gray-300 dark:border-gray-700'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
              <select value={form.sourcePlatform} onChange={e => setForm(f => ({...f, sourcePlatform: e.target.value as WishlistItem['sourcePlatform']}))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
                {(['mercari','yahoo_auctions','surugaya','melonbooks','toranoana','amazon_jp','twitter','other'] as const).map(p => <option key={p} value={p}>{p.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as WishlistItem['status']}))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value as WishlistItem['priority']}))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
            <input value={(form.tags ?? []).join(', ')} onChange={e => setForm(f => ({...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)}))}
              placeholder="kantai_collection, figures"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm resize-none" />
          </div>

          <button onClick={handleSubmit} disabled={!form.title}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'}`}>
            {saved ? '✓ Added to Wishlist' : 'Add to Wishlist'}
          </button>
        </div>
      )}
    </div>
  )
}
