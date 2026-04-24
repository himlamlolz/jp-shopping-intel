import { describe, it, expect } from 'vitest'
import {
  generateJanSearchLinks,
  detectPlatform,
  PROXY_SERVICE_PRESETS,
} from '@/lib/types'

describe('generateJanSearchLinks', () => {
  it('generates correct Amazon JP link', () => {
    const links = generateJanSearchLinks('4902370545562')
    expect(links.amazonJp).toBe('https://www.amazon.co.jp/s?k=4902370545562')
  })

  it('generates correct Suruga-ya link', () => {
    const links = generateJanSearchLinks('4902370545562')
    expect(links.surugaya).toBe('https://www.suruga-ya.jp/search/?search=4902370545562')
  })

  it('generates correct Yahoo Shopping link', () => {
    const links = generateJanSearchLinks('4902370545562')
    expect(links.yahooShopping).toBe('https://shopping.yahoo.co.jp/search?p=4902370545562')
  })

  it('generates correct Mercari link', () => {
    const links = generateJanSearchLinks('4902370545562')
    expect(links.mercari).toBe('https://jp.mercari.com/search?keyword=4902370545562')
  })

  it('generates correct Rakuten link', () => {
    const links = generateJanSearchLinks('4902370545562')
    expect(links.rakuten).toBe('https://search.rakuten.co.jp/search/mall/4902370545562/')
  })

  it('returns exactly 5 platforms', () => {
    const links = generateJanSearchLinks('4902370545562')
    expect(Object.keys(links)).toHaveLength(5)
  })

  it('embeds the JAN code correctly in all links', () => {
    const janCode = '4907953538498'
    const links = generateJanSearchLinks(janCode)
    for (const url of Object.values(links)) {
      expect(url).toContain(janCode)
    }
  })
})

describe('detectPlatform', () => {
  it('detects Mercari', () => {
    expect(detectPlatform('https://jp.mercari.com/item/m12345678')).toBe('mercari')
  })

  it('detects Yahoo Auctions', () => {
    expect(detectPlatform('https://page.auctions.yahoo.co.jp/jp/auction/12345')).toBe('yahoo_auctions')
  })

  it('detects Suruga-ya', () => {
    expect(detectPlatform('https://www.suruga-ya.jp/product/detail/123456')).toBe('surugaya')
  })

  it('detects Melonbooks', () => {
    expect(detectPlatform('https://www.melonbooks.co.jp/detail/detail.php?product_id=1234')).toBe('melonbooks')
  })

  it('detects Toranoana', () => {
    expect(detectPlatform('https://ec.toranoana.jp/tora/ec/item/040030936001/')).toBe('toranoana')
  })

  it('detects Amazon JP', () => {
    expect(detectPlatform('https://www.amazon.co.jp/dp/B01234567890')).toBe('amazon_jp')
  })

  it('detects Twitter', () => {
    expect(detectPlatform('https://twitter.com/user/status/12345')).toBe('twitter')
  })

  it('detects X.com as twitter platform', () => {
    expect(detectPlatform('https://x.com/user/status/12345')).toBe('twitter')
  })

  it('returns other for unknown URLs', () => {
    expect(detectPlatform('https://www.example.com/item/123')).toBe('other')
  })

  it('returns other for invalid URLs', () => {
    expect(detectPlatform('not-a-valid-url')).toBe('other')
  })

  it('returns other for empty string', () => {
    expect(detectPlatform('')).toBe('other')
  })
})

describe('PROXY_SERVICE_PRESETS', () => {
  it('contains Buyee preset', () => {
    const buyee = PROXY_SERVICE_PRESETS.find(p => p.name === 'Buyee')
    expect(buyee).toBeDefined()
    expect(buyee?.fixedFee).toBe(300)
    expect(buyee?.percentageFee).toBe(0.05)
  })

  it('contains Zenmarket preset', () => {
    const zenmarket = PROXY_SERVICE_PRESETS.find(p => p.name === 'Zenmarket')
    expect(zenmarket).toBeDefined()
    expect(zenmarket?.fixedFee).toBe(300)
    expect(zenmarket?.percentageFee).toBe(0)
  })

  it('contains White Rabbit Express preset', () => {
    const wre = PROXY_SERVICE_PRESETS.find(p => p.name === 'White Rabbit Express')
    expect(wre).toBeDefined()
    expect(wre?.fixedFee).toBe(0)
    expect(wre?.percentageFee).toBe(0.10)
  })

  it('contains FROM JAPAN preset', () => {
    const fromJapan = PROXY_SERVICE_PRESETS.find(p => p.name === 'FROM JAPAN')
    expect(fromJapan).toBeDefined()
    expect(fromJapan?.fixedFee).toBe(0)
    expect(fromJapan?.percentageFee).toBe(0.05)
  })

  it('contains Custom preset with zero fees', () => {
    const custom = PROXY_SERVICE_PRESETS.find(p => p.name === 'Custom')
    expect(custom).toBeDefined()
    expect(custom?.fixedFee).toBe(0)
    expect(custom?.percentageFee).toBe(0)
  })

  it('has exactly 5 presets', () => {
    expect(PROXY_SERVICE_PRESETS).toHaveLength(5)
  })

  it('all presets have required fields', () => {
    for (const preset of PROXY_SERVICE_PRESETS) {
      expect(typeof preset.name).toBe('string')
      expect(typeof preset.fixedFee).toBe('number')
      expect(typeof preset.percentageFee).toBe('number')
    }
  })
})
