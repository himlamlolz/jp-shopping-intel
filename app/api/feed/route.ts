import { NextRequest, NextResponse } from 'next/server'

export interface FeedItem {
  guid: string
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail?: string
}

function extractTag(xml: string, tag: string): string | undefined {
  // Match CDATA section or plain text content
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
    'i'
  )
  const match = xml.match(re)
  if (!match) return undefined
  return (match[1] ?? match[2] ?? '').trim()
}

function extractAttr(xml: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*>`, 'i')
  const match = xml.match(re)
  return match?.[1]
}

function decodeXmlEntities(str: string): string {
  return str.replace(
    /&(?:amp|lt|gt|quot|apos|#(\d+)|#x([0-9a-fA-F]+));/g,
    (match, dec?: string, hex?: string) => {
      if (dec !== undefined) return String.fromCharCode(Number(dec))
      if (hex !== undefined) return String.fromCharCode(parseInt(hex, 16))
      switch (match) {
        case '&amp;': return '&'
        case '&lt;': return '<'
        case '&gt;': return '>'
        case '&quot;': return '"'
        case '&apos;': return "'"
        default: return match
      }
    }
  )
}

export function parseRss(xml: string): FeedItem[] {
  const items: FeedItem[] = []
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  for (const match of itemMatches) {
    const itemXml = match[1]
    const guid = extractTag(itemXml, 'guid') ?? extractTag(itemXml, 'link') ?? ''
    const title = decodeXmlEntities(extractTag(itemXml, 'title') ?? '')
    const link = extractTag(itemXml, 'link') ?? ''
    const pubDate = extractTag(itemXml, 'pubDate') ?? ''
    const description = decodeXmlEntities(extractTag(itemXml, 'description') ?? '')
    const thumbnail =
      extractAttr(itemXml, 'media:thumbnail', 'url') ??
      extractAttr(itemXml, 'enclosure', 'url')
    items.push({ guid, title, link, pubDate, description, ...(thumbnail ? { thumbnail } : {}) })
  }
  return items
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const keyword = searchParams.get('keyword')
  const rsshubParam = searchParams.get('rsshub')

  if (!type || (type !== 'twitter' && type !== 'mercari')) {
    return NextResponse.json(
      { error: 'Invalid or missing type parameter. Must be "twitter" or "mercari".' },
      { status: 400 }
    )
  }
  if (!keyword) {
    return NextResponse.json({ error: 'Missing keyword parameter.' }, { status: 400 })
  }

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

  const encodedKeyword = encodeURIComponent(keyword)
  const feedUrl =
    type === 'twitter'
      ? `${rsshub}/twitter/search/${encodedKeyword}`
      : `${rsshub}/mercari/search?keyword=${encodedKeyword}`

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'jp-shopping-intel/1.0' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 502 })
    }
    const xml = await res.text()
    const items = parseRss(xml)
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch RSS feed' }, { status: 500 })
  }
}
