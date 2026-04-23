import { KNOWN_MANUFACTURERS } from './types'

export interface OcrExtraction {
  title?: string
  price?: number
  listingId?: string
  manufacturer?: string
  seriesName?: string
  janCode?: string
  confidence: Record<string, 'high' | 'medium' | 'low'>
}

export function extractFromOcrText(text: string, keywords?: string[]): OcrExtraction {
  const confidence: Record<string, 'high' | 'medium' | 'low'> = {}

  const priceMatch = text.match(/[¥￥]\s?([0-9,]+)/)
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : undefined
  if (price !== undefined) confidence.price = priceMatch![0].length > 4 ? 'high' : 'medium'

  const janMatch = text.match(/\b(4[0-9]{12})\b/)
  const janCode = janMatch?.[1]
  if (janCode) confidence.janCode = 'high'

  const listingMatch = text.match(/\b([A-Z0-9]{6,12})\b/)
  const listingId = listingMatch?.[1]
  if (listingId) confidence.listingId = 'medium'

  let manufacturer: string | undefined
  for (const mfr of KNOWN_MANUFACTURERS) {
    if (text.includes(mfr)) {
      manufacturer = mfr
      confidence.manufacturer = 'high'
      break
    }
  }

  let seriesName: string | undefined
  if (keywords) {
    for (const kw of keywords) {
      if (kw && text.includes(kw)) {
        seriesName = kw
        confidence.seriesName = 'high'
        break
      }
    }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const japaneseLines = lines.filter(l => /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(l))
  const title = japaneseLines.sort((a, b) => b.length - a.length)[0] ?? lines[0]
  if (title) confidence.title = japaneseLines.length > 0 ? 'medium' : 'low'

  return { title, price, listingId, manufacturer, seriesName, janCode, confidence }
}

export function imageFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function preprocessImageForOcr(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MIN_WIDTH = 1200
      let { width, height } = img
      if (width < MIN_WIDTH) {
        const scale = MIN_WIDTH / width
        width = MIN_WIDTH
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('No canvas context')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        // Contrast boost
        const r = Math.min(255, Math.max(0, (d[i]   - 128) * 1.5 + 128))
        const g = Math.min(255, Math.max(0, (d[i+1] - 128) * 1.5 + 128))
        const b = Math.min(255, Math.max(0, (d[i+2] - 128) * 1.5 + 128))
        // Grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        d[i] = d[i+1] = d[i+2] = gray
      }
      ctx.putImageData(imageData, 0, 0)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob failed'))
      }, 'image/png')
    }
    img.onerror = reject
    img.src = url
  })
}
