export interface GeminiExtraction {
  title?: string
  price?: number
  sourcePlatform?: string
  condition?: string
  listingId?: string
  tags?: string[]
  notes?: string
}

export async function extractWithGemini(imageBase64: string, apiKey: string): Promise<GeminiExtraction> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': apiKey },
    body: JSON.stringify({ imageBase64 }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Gemini API error (HTTP ${res.status})`)
  }
  return res.json()
}
