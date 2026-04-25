import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { imageBase64: string; mode?: string }
    const { imageBase64 } = body
    const apiKey = req.headers.get('x-vision-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'No Vision API key provided' }, { status: 400 })
    }
    const feature = 'DOCUMENT_TEXT_DETECTION'
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: imageBase64 }, features: [{ type: feature, maxResults: 1 }] }],
        }),
      }
    )
    if (!visionRes.ok) {
      const err = await visionRes.json() as { error?: { message?: string; code?: number; status?: string } }
      return NextResponse.json(
        { error: err.error?.message ?? 'Vision API error', code: err.error?.code, status: err.error?.status },
        { status: 502 }
      )
    }
    const visionData = await visionRes.json() as { responses?: Array<{ fullTextAnnotation?: { text?: string } }> }
    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? ''
    return NextResponse.json({ text: fullText })
  } catch {
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 })
  }
}
