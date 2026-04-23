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
