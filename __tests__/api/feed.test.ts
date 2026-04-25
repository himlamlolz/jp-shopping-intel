import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, parseRss } from '@/app/api/feed/route'

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/feed')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Feed</title>
    <item>
      <guid>https://example.com/item/1</guid>
      <title><![CDATA[Test Item One]]></title>
      <link>https://example.com/item/1</link>
      <pubDate>Sat, 01 Jan 2025 00:00:00 +0000</pubDate>
      <description><![CDATA[Description one]]></description>
      <media:thumbnail url="https://example.com/thumb1.jpg"/>
    </item>
    <item>
      <guid>https://example.com/item/2</guid>
      <title>Test Item &amp; Two</title>
      <link>https://example.com/item/2</link>
      <pubDate>Sun, 02 Jan 2025 00:00:00 +0000</pubDate>
      <description>Description &lt;two&gt;</description>
    </item>
  </channel>
</rss>`

describe('parseRss', () => {
  it('parses CDATA title and description', () => {
    const items = parseRss(SAMPLE_RSS)
    expect(items).toHaveLength(2)
    expect(items[0].title).toBe('Test Item One')
    expect(items[0].description).toBe('Description one')
  })

  it('parses guid and link', () => {
    const items = parseRss(SAMPLE_RSS)
    expect(items[0].guid).toBe('https://example.com/item/1')
    expect(items[0].link).toBe('https://example.com/item/1')
  })

  it('parses pubDate', () => {
    const items = parseRss(SAMPLE_RSS)
    expect(items[0].pubDate).toBe('Sat, 01 Jan 2025 00:00:00 +0000')
  })

  it('parses media:thumbnail url', () => {
    const items = parseRss(SAMPLE_RSS)
    expect(items[0].thumbnail).toBe('https://example.com/thumb1.jpg')
  })

  it('omits thumbnail when absent', () => {
    const items = parseRss(SAMPLE_RSS)
    expect(items[1].thumbnail).toBeUndefined()
  })

  it('decodes XML entities in plain-text title and description', () => {
    const items = parseRss(SAMPLE_RSS)
    expect(items[1].title).toBe('Test Item & Two')
    expect(items[1].description).toBe('Description <two>')
  })

  it('returns empty array for XML with no items', () => {
    expect(parseRss('<rss><channel></channel></rss>')).toHaveLength(0)
  })
})

describe('GET /api/feed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when type is missing', async () => {
    const req = makeRequest({ keyword: 'gunpla' })
    const res = await GET(req)
    const data = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/type/)
  })

  it('returns 400 when type is invalid', async () => {
    const req = makeRequest({ type: 'instagram', keyword: 'gunpla' })
    const res = await GET(req)
    const data = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/type/)
  })

  it('returns 400 when keyword is missing', async () => {
    const req = makeRequest({ type: 'twitter' })
    const res = await GET(req)
    const data = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(data.error).toMatch(/keyword/)
  })

  it('constructs correct Twitter RSSHub URL', async () => {
    let capturedUrl: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string) => {
      capturedUrl = url
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest({ type: 'twitter', keyword: 'hololive' })
    await GET(req)
    expect(capturedUrl).toBe('https://rsshub.app/twitter/search/hololive')
    vi.unstubAllGlobals()
  })

  it('constructs correct Mercari RSSHub URL', async () => {
    let capturedUrl: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string) => {
      capturedUrl = url
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest({ type: 'mercari', keyword: 'ガンプラ' })
    await GET(req)
    expect(capturedUrl).toBe(`https://rsshub.app/mercari/search?keyword=${encodeURIComponent('ガンプラ')}`)
    vi.unstubAllGlobals()
  })

  it('uses custom rsshub base URL when provided', async () => {
    let capturedUrl: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string) => {
      capturedUrl = url
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest({ type: 'twitter', keyword: 'test', rsshub: 'https://my-rsshub.example.com' })
    await GET(req)
    expect(capturedUrl).toBe('https://my-rsshub.example.com/twitter/search/test')
    vi.unstubAllGlobals()
  })

  it('returns 400 for invalid rsshub URL', async () => {
    const req = makeRequest({ type: 'twitter', keyword: 'test', rsshub: 'not-a-url' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-http rsshub protocol', async () => {
    const req = makeRequest({ type: 'twitter', keyword: 'test', rsshub: 'ftp://evil.example.com' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('encodes keyword with special characters in Twitter URL', async () => {
    let capturedUrl: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string) => {
      capturedUrl = url
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest({ type: 'twitter', keyword: 'hololive 新商品' })
    await GET(req)
    expect(capturedUrl).toBe(`https://rsshub.app/twitter/search/${encodeURIComponent('hololive 新商品')}`)
    vi.unstubAllGlobals()
  })

  it('returns parsed items on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => SAMPLE_RSS,
    }))

    const req = makeRequest({ type: 'twitter', keyword: 'test' })
    const res = await GET(req)
    const data = await res.json() as { items: unknown[] }

    expect(res.status).toBe(200)
    expect(data.items).toHaveLength(2)
    vi.unstubAllGlobals()
  })

  it('returns 502 when upstream RSS fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }))

    const req = makeRequest({ type: 'mercari', keyword: 'test' })
    const res = await GET(req)
    const data = await res.json() as { error: string }

    expect(res.status).toBe(502)
    expect(data.error).toBe('Failed to fetch RSS feed')
    vi.unstubAllGlobals()
  })

  it('returns 500 when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network error')))

    const req = makeRequest({ type: 'twitter', keyword: 'test' })
    const res = await GET(req)
    const data = await res.json() as { error: string }

    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to fetch RSS feed')
    vi.unstubAllGlobals()
  })
})
