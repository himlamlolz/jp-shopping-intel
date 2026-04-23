'use client'
import { useEffect, useRef, useState } from 'react'
import { Camera, Upload, RotateCcw, ExternalLink } from 'lucide-react'
import { generateJanSearchLinks } from '@/lib/types'

const PLATFORM_LABELS: Record<string, string> = {
  amazonJp: 'Amazon JP',
  surugaya: 'Suruga-ya',
  yahooShopping: 'Yahoo Shopping',
  mercari: 'Mercari JP',
  rakuten: 'Rakuten',
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop(): void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<'scanning' | 'result' | 'error'>('scanning')
  const [janCode, setJanCode] = useState<string | null>(null)
  const [searchLinks, setSearchLinks] = useState<Record<string, string>>({})
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraAvailable, setCameraAvailable] = useState(true)

  const stopAll = () => {
    try { controlsRef.current?.stop() } catch { /* ignore */ }
    controlsRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const startScanning = async () => {
    setPhase('scanning')
    setJanCode(null)
    setErrorMsg('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current ?? undefined,
        (result, err) => {
          if (!result) return
          if (err) return
          const text = result.getText()
          if (/^4\d{12}$/.test(text)) {
            stopAll()
            setJanCode(text)
            setSearchLinks(generateJanSearchLinks(text))
            setPhase('result')
          }
        }
      )
      controlsRef.current = controls
    } catch {
      setCameraAvailable(false)
      setErrorMsg('Camera not available. Use the file picker below.')
      setPhase('error')
    }
  }

  useEffect(() => {
    startScanning()
    return () => { stopAll() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScanAgain = () => {
    stopAll()
    startScanning()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = URL.createObjectURL(file)
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageUrl(url)
      URL.revokeObjectURL(url)
      const text = result.getText()
      if (/^4\d{12}$/.test(text)) {
        stopAll()
        setJanCode(text)
        setSearchLinks(generateJanSearchLinks(text))
        setPhase('result')
      } else {
        setErrorMsg(`Barcode detected (${text}) but it is not a JAN-13 code starting with 4.`)
        setPhase('error')
      }
    } catch {
      setErrorMsg('No barcode found in the image. Try a clearer photo.')
      setPhase('error')
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Camera className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Barcode Scanner
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scan JAN/EAN-13 barcodes on physical products in stores (Akihabara, etc.) to instantly
          find listings across all major Japanese shopping platforms.
        </p>
      </div>

      {phase === 'scanning' && (
        <div className="space-y-4">
          {cameraAvailable ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-24 border-2 border-white/60 rounded-lg" />
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
                Point at a JAN-13 barcode
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-100 dark:bg-gray-800 aspect-video flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Camera unavailable</p>
            </div>
          )}
          <div className="text-center">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" />
              Upload photo instead
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
          <label className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer font-semibold transition-colors">
            <Upload className="w-4 h-4" />
            Upload photo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={handleScanAgain}
            className="w-full py-3 rounded-xl font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Try Camera Again
          </button>
        </div>
      )}

      {phase === 'result' && janCode && (
        <div className="space-y-4">
          <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide mb-1">JAN Code Detected</p>
            <p className="text-3xl font-mono font-bold text-green-800 dark:text-green-200 tracking-widest">{janCode}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Search on platforms:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(searchLinks).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800">
                  {PLATFORM_LABELS[key] ?? key}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>

          <button onClick={handleScanAgain}
            className="w-full py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Scan Again
          </button>

          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer font-semibold transition-colors">
            <Upload className="w-4 h-4" />
            Upload photo instead
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      )}
    </div>
  )
}
