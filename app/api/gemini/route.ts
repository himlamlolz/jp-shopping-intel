import { NextRequest, NextResponse } from 'next/server'

const GEMINI_PROMPT = `You are a Japanese shopping assistant. Analyze this screenshot of a Japanese e-commerce product listing and extract the following fields. Respond ONLY with a valid JSON object, no markdown, no explanation.

{
  "title": "full product title in Japanese exactly as shown",
  "price": 700,
  "sourcePlatform": "mercari | yahoo_auctions | surugaya | melonbooks | toranoana | amazon_jp | other",
  "condition": "new | like_new | good | fair | poor | null",
  "listingId": "item ID string if visible, or null",
  "tags": ["array", "of", "relevant", "japanese", "tags"],
  "notes": "brief notes from description if useful, or null"
}

Rules:
- price must be a number (JPY), not a string
- condition: use "new" for 新品/未使用, "like_new" for 未使用に近い, "good" for 目立った傷や汚れなし, "fair" for やや傷や汚れあり, "poor" for 傷や汚れあり/全体的に状態が悪い, null if not visible
- sourcePlatform: detect from UI elements (Mercari logo/style = mercari, Yahoo Auctions = yahoo_auctions, etc.)
- tags: extract character names, series names, item type (ぬいぐるみ、フィギュア、くじ etc.), up to 6 tags
- listingId: on Mercari this looks like "m" followed by digits, on Yahoo Auctions it's a number
- If a field cannot be determined, use null`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { imageBase64: string }
    const { imageBase64 } = body
    const apiKey = req.headers.get('x-gemini-api-key')
    if (!apiKey) {
      return NextResponse.json({ error: 'No Gemini API key provided' }, { status: 400 })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: GEMINI_PROMPT },
              ],
            },
          ],
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json() as { error?: { message?: string; code?: number; status?: string } }
      return NextResponse.json(
        { error: err.error?.message ?? 'Gemini API error', code: err.error?.code, status: err.error?.status },
        { status: 502 }
      )
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Strip markdown code fences if Gemini wraps JSON in ```json ... ```
    const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    try {
      const extraction = JSON.parse(stripped) as Record<string, unknown>
      return NextResponse.json(extraction)
    } catch {
      return NextResponse.json({ error: 'Failed to parse Gemini response' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Gemini processing failed' }, { status: 500 })
  }
}
