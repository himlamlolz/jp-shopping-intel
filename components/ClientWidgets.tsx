'use client'
import dynamic from 'next/dynamic'

const CurrencyWidget = dynamic(() => import('./CurrencyWidget'), { ssr: false })

export default function ClientWidgets() {
  return <CurrencyWidget />
}
