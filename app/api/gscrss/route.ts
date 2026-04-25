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

const GSC_EN_RSS = 'https://www.goodsmile.info/en/rss'
const GSC_JA_RSS = 'https://www.goodsmile.info/ja/rss'

async function fetchRssItems(url: string): Promise<GscRssItem[] | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; jp-shopping-intel/1.0)' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return null
  const xml = await res.text()
  const items = parseRssItems(xml)
  return items.length > 0 ? items : null
}

export async function GET(req: NextRequest) {
  const rsshubParam = req.nextUrl.searchParams.get('rsshub')

  if (rsshubParam) {
    let parsedRsshub: URL
    try {
      parsedRsshub = new URL(rsshubParam)
    } catch {
      return NextResponse.json({ error: 'Invalid rsshub URL.' }, { status: 400 })
    }
    if (parsedRsshub.protocol !== 'https:' && parsedRsshub.protocol !== 'http:') {
      return NextResponse.json({ error: 'Invalid rsshub URL.' }, { status: 400 })
    }
    const feedUrl = `${parsedRsshub.protocol}//${parsedRsshub.host}/goodsmile/news`
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; jp-shopping-intel/1.0)' },
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

  try {
    const enItems = await fetchRssItems(GSC_EN_RSS)
    if (enItems) {
      return NextResponse.json({ items: enItems })
    }
    const jaItems = await fetchRssItems(GSC_JA_RSS)
    if (jaItems) {
      return NextResponse.json({ items: jaItems })
    }
    return NextResponse.json({ items: [], error: 'RSS fetch failed: no items returned' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ items: [], error: message })
  }
}
