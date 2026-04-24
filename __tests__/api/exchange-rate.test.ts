import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('GET /api/exchange-rate', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Reset the module-level cache between tests by re-importing
    vi.resetModules()
  })

  it('returns exchange rates on successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rates: { USD: 0.0067, EUR: 0.0062, GBP: 0.0053 },
      }),
    }))

    // Re-import to get fresh module without cache
    const { GET: freshGet } = await import('@/app/api/exchange-rate/route')
    const response = await freshGet()
    const data = await response.json() as { rates: Record<string, number>; cached?: boolean }

    expect(response.status).toBe(200)
    expect(data.rates).toBeDefined()
    expect(data.rates.USD).toBe(0.0067)
    vi.unstubAllGlobals()
  })

  it('returns error response when Frankfurter API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    }))

    const { GET: freshGet } = await import('@/app/api/exchange-rate/route')
    const response = await freshGet()
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch exchange rates')
    vi.unstubAllGlobals()
  })

  it('returns error response when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))

    const { GET: freshGet } = await import('@/app/api/exchange-rate/route')
    const response = await freshGet()
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch exchange rates')
    vi.unstubAllGlobals()
  })
})
