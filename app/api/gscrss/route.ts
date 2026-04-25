import { NextRequest, NextResponse } from 'next/server'

export interface GscRssItem {
  title: string
  link: string
  pubDate: string
  description: string
}

function parseRssItems(xml: string): GscRssItem[] {
  const items: GscRssItem[] = []
  const itemPattern = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null
  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1]
    const title = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(block)?.[1]
      ?? /<title>([\s\S]*?)<\/title>/.exec(block)?.[1]
      ?? ''
    const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1]
      ?? ''
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1]
      ?? ''
    const description = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(block)?.[1]
      ?? /<description>([\s\S]*?)<\/description>/.exec(block)?.[1]
      ?? ''
    items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim(), description: description.trim() })
  }
  return items
}

export async function GET(req: NextRequest) {
  const rsshubParam = req.nextUrl.searchParams.get('rsshub')

  let rsshub = 'https://rsshub.app'
  if (rsshubParam) {
    try {
      const parsed = new URL(rsshubParam)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return NextResponse.json({ error: 'Invalid rsshub URL.' }, { status: 400 })
      }
      rsshub = `${parsed.protocol}//${parsed.host}`
    } catch {
      return NextResponse.json({ error: 'Invalid rsshub URL.' }, { status: 400 })
    }
  }

  const feedUrl = `${rsshub}/goodsmile/news`

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'jp-shopping-intel/1.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return NextResponse.json({ items: [], error: `RSS fetch failed: ${res.status}` })
    }
    const xml = await res.text()
    const items = parseRssItems(xml)
    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ items: [], error: message })
  }
}
