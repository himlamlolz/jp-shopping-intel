import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractWithGemini } from '@/lib/gemini-utils'

describe('extractWithGemini', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the right endpoint with the right headers', async () => {
    const extraction = { title: 'テスト商品', price: 800 }
    let capturedUrl: string | null = null
    let capturedHeaders: Record<string, string> = {}
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (url: string, init: RequestInit) => {
      capturedUrl = url
      capturedHeaders = Object.fromEntries(new Headers(init.headers as HeadersInit).entries())
      return {
        ok: true,
        json: async () => extraction,
      }
    }))

    await extractWithGemini('base64data', 'test-api-key')

    expect(capturedUrl).toBe('/api/gemini')
    expect(capturedHeaders['content-type']).toBe('application/json')
    expect(capturedHeaders['x-gemini-api-key']).toBe('test-api-key')
    vi.unstubAllGlobals()
  })

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API error' }),
    }))

    await expect(extractWithGemini('base64data', 'bad-key')).rejects.toThrow('Gemini API error')
    vi.unstubAllGlobals()
  })

  it('returns parsed extraction on success', async () => {
    const extraction = {
      title: 'ちいかわくじ',
      price: 700,
      sourcePlatform: 'mercari',
      condition: 'new',
      listingId: 'm87654321',
      tags: ['ちいかわ', 'くじ'],
      notes: '送料込み',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => extraction,
    }))

    const result = await extractWithGemini('base64data', 'test-key')

    expect(result.title).toBe('ちいかわくじ')
    expect(result.price).toBe(700)
    expect(result.sourcePlatform).toBe('mercari')
    expect(result.condition).toBe('new')
    expect(result.listingId).toBe('m87654321')
    expect(result.tags).toEqual(['ちいかわ', 'くじ'])
    expect(result.notes).toBe('送料込み')
    vi.unstubAllGlobals()
  })
})
