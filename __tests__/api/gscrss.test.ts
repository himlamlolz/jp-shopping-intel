import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/gscrss/route'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/gscrss')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Good Smile News</title>
    <item>
      <title><![CDATA[Nendoroid Test Figure]]></title>
      <link>https://www.goodsmile.info/en/post/1</link>
      <pubDate>Sat, 01 Jan 2025 00:00:00 +0000</pubDate>
      <description><![CDATA[A test figure announcement]]></description>
    </item>
    <item>
      <title>Another Figure</title>
      <link>https://www.goodsmile.info/en/post/2</link>
      <pubDate>Sun, 02 Jan 2025 00:00:00 +0000</pubDate>
      <description>Plain description</description>
    </item>
  </channel>
</rss>`

describe('GET /api/gscrss', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns items:[] and error message when upstream returns 403', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 }),
    )

    const req = makeRequest()
    const res = await GET(req)
    const data = await res.json() as { items: unknown[]; error: string }

    expect(data.items).toEqual([])
    expect(data.error).toBe('RSS fetch failed: no items returned')
    vi.unstubAllGlobals()
  })

  it('returns parsed items on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => SAMPLE_RSS,
    }))

    const req = makeRequest()
    const res = await GET(req)
    const data = await res.json() as { items: { title: string; link: string }[] }

    expect(res.status).toBe(200)
    expect(data.items).toHaveLength(2)
    expect(data.items[0].title).toBe('Nendoroid Test Figure')
    expect(data.items[0].link).toBe('https://www.goodsmile.info/en/post/1')
    vi.unstubAllGlobals()
  })

  it('uses custom rsshub param when provided', async () => {
    let capturedUrl: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string) => {
      capturedUrl = url
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest({ rsshub: 'https://my-rsshub.example.com' })
    await GET(req)
    expect(capturedUrl).toBe('https://my-rsshub.example.com/goodsmile/news')
    vi.unstubAllGlobals()
  })

  it('uses default GSC EN RSS URL when no param provided', async () => {
    let capturedUrl: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string) => {
      capturedUrl = url
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest()
    await GET(req)
    expect(capturedUrl).toBe('https://www.goodsmile.info/en/rss')
    vi.unstubAllGlobals()
  })

  it('falls back to JA RSS when EN feed returns no items', async () => {
    const EMPTY_RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel></channel></rss>`
    const capturedUrls: string[] = []
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      capturedUrls.push(url)
      if (url.includes('/en/rss')) {
        return { ok: true, text: async () => EMPTY_RSS }
      }
      return { ok: true, text: async () => SAMPLE_RSS }
    }))

    const req = makeRequest()
    const res = await GET(req)
    const data = await res.json() as { items: { title: string }[] }

    expect(capturedUrls[0]).toBe('https://www.goodsmile.info/en/rss')
    expect(capturedUrls[1]).toBe('https://www.goodsmile.info/ja/rss')
    expect(data.items).toHaveLength(2)
    vi.unstubAllGlobals()
  })

  it('returns 400 for invalid rsshub URL', async () => {
    const req = makeRequest({ rsshub: 'not-a-url' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-http rsshub protocol', async () => {
    const req = makeRequest({ rsshub: 'ftp://evil.example.com' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns items:[] and error message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network error')))

    const req = makeRequest()
    const res = await GET(req)
    const data = await res.json() as { items: unknown[]; error: string }

    expect(data.items).toEqual([])
    expect(data.error).toBe('network error')
    vi.unstubAllGlobals()
  })
})
