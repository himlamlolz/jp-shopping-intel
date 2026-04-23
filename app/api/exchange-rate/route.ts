import { NextResponse } from 'next/server'

let cached: { rates: Record<string, number>; fetchedAt: number } | null = null
const CACHE_MS = 4 * 60 * 60 * 1000

export async function GET() {
  try {
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
      return NextResponse.json({ rates: cached.rates, cached: true })
    }
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=JPY&to=USD,HKD,TWD,SGD,EUR,GBP,AUD,CAD,KRW,CNY'
    )
    if (!res.ok) throw new Error('Frankfurter API error')
    const data = await res.json() as { rates: Record<string, number> }
    cached = { rates: data.rates, fetchedAt: Date.now() }
    return NextResponse.json({ rates: data.rates, cached: false })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 })
  }
}
