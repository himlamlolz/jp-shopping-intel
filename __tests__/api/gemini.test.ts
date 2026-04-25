import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/gemini/route'
import { NextRequest } from 'next/server'

function makeRequest(body: object, apiKey?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/gemini', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-gemini-api-key': apiKey } : {}),
    },
  })
  return req
}

describe('POST /api/gemini', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when no Gemini API key is provided', async () => {
    const req = makeRequest({ imageBase64: 'base64data' })
    const response = await POST(req)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toBe('No Gemini API key provided')
  })

  it('returns 502 when Gemini API returns non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'API key not valid', code: 400, status: 'INVALID_ARGUMENT' } }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'bad-key')
    const response = await POST(req)
    const data = await response.json() as { error: string; code: number; status: string }

    expect(response.status).toBe(502)
    expect(data.error).toBe('API key not valid')
    expect(data.code).toBe(400)
    expect(data.status).toBe('INVALID_ARGUMENT')
    vi.unstubAllGlobals()
  })

  it('returns parsed extraction on success', async () => {
    const extraction = {
      title: 'ちいかわぬいぐるみ',
      price: 1200,
      sourcePlatform: 'mercari',
      condition: 'like_new',
      listingId: 'm12345678',
      tags: ['ちいかわ', 'ぬいぐるみ'],
      notes: null,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(extraction) }] } }],
      }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-key')
    const response = await POST(req)
    const data = await response.json() as typeof extraction

    expect(response.status).toBe(200)
    expect(data.title).toBe('ちいかわぬいぐるみ')
    expect(data.price).toBe(1200)
    expect(data.sourcePlatform).toBe('mercari')
    expect(data.listingId).toBe('m12345678')
    vi.unstubAllGlobals()
  })

  it('strips markdown code fences before parsing', async () => {
    const extraction = { title: 'テスト商品', price: 500 }
    const wrappedText = '```json\n' + JSON.stringify(extraction) + '\n```'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: wrappedText }] } }],
      }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-key')
    const response = await POST(req)
    const data = await response.json() as { title: string; price: number }

    expect(response.status).toBe(200)
    expect(data.title).toBe('テスト商品')
    expect(data.price).toBe(500)
    vi.unstubAllGlobals()
  })

  it('returns 500 when Gemini returns non-JSON text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'This is not JSON at all' }] } }],
      }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-key')
    const response = await POST(req)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to parse Gemini response')
    vi.unstubAllGlobals()
  })

  it('returns 502 with generic message when Gemini error has no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'bad-key')
    const response = await POST(req)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(502)
    expect(data.error).toBe('Gemini API error')
    vi.unstubAllGlobals()
  })
})
