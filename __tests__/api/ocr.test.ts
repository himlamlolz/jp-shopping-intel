import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/ocr/route'
import { NextRequest } from 'next/server'

function makeRequest(body: object, apiKey?: string): NextRequest {
  const req = new NextRequest('http://localhost/api/ocr', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-vision-api-key': apiKey } : {}),
    },
  })
  return req
}

describe('POST /api/ocr', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when no Vision API key is provided', async () => {
    const req = makeRequest({ imageBase64: 'base64data' })
    const response = await POST(req)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toBe('No Vision API key provided')
  })

  it('returns extracted text on successful Vision API call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        responses: [{ fullTextAnnotation: { text: 'Extracted OCR text' } }],
      }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-api-key')
    const response = await POST(req)
    const data = await response.json() as { text: string }

    expect(response.status).toBe(200)
    expect(data.text).toBe('Extracted OCR text')
    vi.unstubAllGlobals()
  })

  it('returns empty string when fullTextAnnotation is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        responses: [{}],
      }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-api-key')
    const response = await POST(req)
    const data = await response.json() as { text: string }

    expect(response.status).toBe(200)
    expect(data.text).toBe('')
    vi.unstubAllGlobals()
  })

  it('returns 502 when Vision API returns an error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Invalid API key', code: 400, status: 'INVALID_ARGUMENT' } }),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'bad-key')
    const response = await POST(req)
    const data = await response.json() as { error: string; code: number; status: string }

    expect(response.status).toBe(502)
    expect(data.error).toBe('Invalid API key')
    expect(data.code).toBe(400)
    expect(data.status).toBe('INVALID_ARGUMENT')
    vi.unstubAllGlobals()
  })

  it('returns 502 with generic message when Vision API error has no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'bad-key')
    const response = await POST(req)
    const data = await response.json() as { error: string; code: undefined; status: undefined }

    expect(response.status).toBe(502)
    expect(data.error).toBe('Vision API error')
    expect(data.code).toBeUndefined()
    expect(data.status).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('returns 500 when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-api-key')
    const response = await POST(req)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBe('OCR processing failed')
    vi.unstubAllGlobals()
  })

  it('uses DOCUMENT_TEXT_DETECTION feature', async () => {
    let capturedBody: string | null = null
    vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string
      return {
        ok: true,
        json: async () => ({ responses: [{ fullTextAnnotation: { text: '' } }] }),
      }
    }))

    const req = makeRequest({ imageBase64: 'base64data' }, 'test-key')
    await POST(req)

    expect(capturedBody).toContain('DOCUMENT_TEXT_DETECTION')
    vi.unstubAllGlobals()
  })
})
