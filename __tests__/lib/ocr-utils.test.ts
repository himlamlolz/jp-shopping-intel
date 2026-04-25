import { describe, it, expect } from 'vitest'
import { extractFromOcrText } from '@/lib/ocr-utils'

describe('extractFromOcrText', () => {
  describe('price extraction', () => {
    it('extracts yen price with ¥ symbol', () => {
      const result = extractFromOcrText('商品名\n¥12,345\nその他')
      expect(result.price).toBe(12345)
    })

    it('extracts yen price with ￥ full-width symbol', () => {
      const result = extractFromOcrText('商品名\n￥8,000\nその他')
      expect(result.price).toBe(8000)
    })

    it('extracts price without comma', () => {
      const result = extractFromOcrText('¥500')
      expect(result.price).toBe(500)
    })

    it('extracts price with space after symbol', () => {
      const result = extractFromOcrText('¥ 3,200')
      expect(result.price).toBe(3200)
    })

    it('sets high confidence for price with more than 4 chars', () => {
      const result = extractFromOcrText('¥12,345')
      expect(result.confidence.price).toBe('high')
    })

    it('sets medium confidence for short price', () => {
      const result = extractFromOcrText('¥500')
      expect(result.confidence.price).toBe('medium')
    })

    it('returns undefined price when none present', () => {
      const result = extractFromOcrText('No price here')
      expect(result.price).toBeUndefined()
    })
  })

  describe('JAN code extraction', () => {
    it('extracts valid JAN code starting with 4', () => {
      const result = extractFromOcrText('JAN: 4902370545562')
      expect(result.janCode).toBe('4902370545562')
    })

    it('sets high confidence for JAN code', () => {
      const result = extractFromOcrText('4902370545562')
      expect(result.confidence.janCode).toBe('high')
    })

    it('returns undefined for non-JAN barcode (not starting with 4)', () => {
      const result = extractFromOcrText('1234567890123')
      expect(result.janCode).toBeUndefined()
    })

    it('does not match 12-digit code as JAN', () => {
      const result = extractFromOcrText('490237054556')
      expect(result.janCode).toBeUndefined()
    })

    it('does not match 14-digit code as JAN', () => {
      const result = extractFromOcrText('49023705455621')
      expect(result.janCode).toBeUndefined()
    })
  })

  describe('listing ID extraction', () => {
    it('extracts uppercase alphanumeric listing ID', () => {
      const result = extractFromOcrText('Item ID: ABCDEF')
      expect(result.listingId).toBeDefined()
    })

    it('sets medium confidence for listing ID', () => {
      const result = extractFromOcrText('ABCDEF12')
      expect(result.confidence.listingId).toBe('medium')
    })
  })

  describe('manufacturer extraction', () => {
    it('detects Kotobukiya', () => {
      const result = extractFromOcrText('Kotobukiya 1/7 Scale Figure')
      expect(result.manufacturer).toBe('Kotobukiya')
      expect(result.confidence.manufacturer).toBe('high')
    })

    it('detects Good Smile Company', () => {
      const result = extractFromOcrText('Good Smile Company Nendoroid')
      expect(result.manufacturer).toBe('Good Smile Company')
    })

    it('detects Bandai', () => {
      const result = extractFromOcrText('バンダイ ガンプラ MG')
      expect(result.manufacturer).toBe('バンダイ')
    })

    it('detects Japanese manufacturer name', () => {
      const result = extractFromOcrText('コトブキヤ 新製品')
      expect(result.manufacturer).toBe('コトブキヤ')
    })

    it('returns undefined when no known manufacturer', () => {
      const result = extractFromOcrText('Unknown Brand Co.')
      expect(result.manufacturer).toBeUndefined()
    })
  })

  describe('series name extraction from keywords', () => {
    it('extracts series name matching keyword', () => {
      const result = extractFromOcrText('艦これ 島風 フィギュア', ['艦これ', 'KanColle'])
      expect(result.seriesName).toBe('艦これ')
      expect(result.confidence.seriesName).toBe('high')
    })

    it('extracts English keyword when present', () => {
      const result = extractFromOcrText('Hololive Vtuber figure', ['Hololive', 'ホロライブ'])
      expect(result.seriesName).toBe('Hololive')
    })

    it('returns undefined when no keyword matches', () => {
      const result = extractFromOcrText('Unknown series item', ['艦これ', 'Hololive'])
      expect(result.seriesName).toBeUndefined()
    })

    it('returns undefined when no keywords provided', () => {
      const result = extractFromOcrText('艦これ figure')
      expect(result.seriesName).toBeUndefined()
    })

    it('ignores empty keyword strings', () => {
      const result = extractFromOcrText('test text', ['', '  '])
      expect(result.seriesName).toBeUndefined()
    })
  })

  describe('title extraction', () => {
    it('extracts Japanese title line', () => {
      const result = extractFromOcrText('島風 1/7スケールフィギュア\n¥8,800')
      expect(result.title).toBeDefined()
      expect(result.title).toContain('島風')
    })

    it('prefers lines before the price line', () => {
      const text = '艦これ 島風フィギュア\n¥8,800\n送料無料'
      const result = extractFromOcrText(text)
      expect(result.title).toContain('島風')
    })

    it('falls back to first line when no Japanese text', () => {
      const result = extractFromOcrText('FIGURE TITLE\n¥500')
      expect(result.title).toBe('FIGURE TITLE')
    })

    it('sets high confidence when Japanese text present', () => {
      const result = extractFromOcrText('日本語タイトル\n¥500')
      expect(result.confidence.title).toBe('high')
    })

    it('sets low confidence when no Japanese text', () => {
      const result = extractFromOcrText('ENGLISH TITLE\n500')
      expect(result.confidence.title).toBe('low')
    })

    it('ignores very short lines (5 chars or less) for title', () => {
      const result = extractFromOcrText('短い\n¥500\n長いタイトルの商品名はここです')
      // Short line '短い' (3 chars) should be skipped in favor of longer line
      expect(result.title).toContain('長いタイトルの商品名はここです')
    })

    it('returns undefined title for empty text', () => {
      const result = extractFromOcrText('')
      expect(result.title).toBeUndefined()
    })

    it('filters out breadcrumb lines containing ＞', () => {
      const text = [
        'ホーム＞ゲーム・おもちゃ・グッズ＞キャラクターグッズ＞バッグ・ポーチ',
        'ちいかわくじ　もちっとふわっとコレクション',
        '¥1,200',
      ].join('\n')
      const result = extractFromOcrText(text)
      expect(result.title).not.toContain('＞')
      expect(result.title).toContain('ちいかわくじ')
    })

    it('filters out lines starting with ホーム', () => {
      const text = 'ホーム\n商品タイトルはここ\n¥500'
      const result = extractFromOcrText(text)
      expect(result.title).toBe('商品タイトルはここ')
    })

    it('joins adjacent short Japanese lines before the price', () => {
      const text = [
        'ちいかわくじ　もちっとふわっとコレクション',
        'D賞　まんまるポーチ　うさぎ　②',
        '¥1,200',
      ].join('\n')
      const result = extractFromOcrText(text)
      expect(result.title).toContain('ちいかわくじ')
      expect(result.title).toContain('D賞')
    })
  })

  describe('combined extraction', () => {
    it('extracts multiple fields from a realistic screenshot text', () => {
      const text = [
        'ホロライブ production',
        '白上フブキ 1/7 フィギュア',
        '¥19,800',
        'Good Smile Company',
        '4580590143838',
        'M12345678',
      ].join('\n')

      const result = extractFromOcrText(text, ['ホロライブ', 'Hololive'])
      expect(result.price).toBe(19800)
      expect(result.janCode).toBe('4580590143838')
      expect(result.manufacturer).toBe('Good Smile Company')
      expect(result.seriesName).toBe('ホロライブ')
      expect(result.title).toBeDefined()
    })

    it('returns empty confidence object for empty input', () => {
      const result = extractFromOcrText('')
      expect(result.confidence).toEqual({})
    })
  })
})
