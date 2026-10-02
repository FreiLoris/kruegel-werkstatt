import { describe, expect, it } from 'vitest'
import { formatDatum, formatUhrzeit, formatZeitpunkt } from './format'

describe('formatDatum', () => {
  it('formatiert ISO-Datum ins Schweizer Format', () => {
    expect(formatDatum('2026-10-15')).toBe('15.10.2026')
  })

  it('verschiebt das Datum nicht wegen Zeitzonen', () => {
    expect(formatDatum('2026-01-01')).toBe('01.01.2026')
  })

  it('lehnt ungültige Werte ab', () => {
    expect(() => formatDatum('15.10.2026')).toThrow()
  })
})

describe('formatUhrzeit', () => {
  it('lässt Sekunden weg', () => {
    expect(formatUhrzeit('08:00:00')).toBe('08:00')
    expect(formatUhrzeit('17:30')).toBe('17:30')
  })

  it('lehnt ungültige Werte ab', () => {
    expect(() => formatUhrzeit('8 Uhr')).toThrow()
  })
})

describe('formatZeitpunkt', () => {
  it('rechnet in Winterzeit um (UTC+1)', () => {
    expect(formatZeitpunkt('2026-01-15T07:00:00Z')).toBe('15.01.2026, 08:00')
  })

  it('rechnet in Sommerzeit um (UTC+2)', () => {
    expect(formatZeitpunkt('2026-07-15T06:00:00Z')).toBe('15.07.2026, 08:00')
  })

  it('wechselt nach Mitternacht korrekt das Datum', () => {
    expect(formatZeitpunkt('2026-10-14T22:30:00Z')).toBe('15.10.2026, 00:30')
  })

  it('lehnt ungültige Werte ab', () => {
    expect(() => formatZeitpunkt('gestern')).toThrow()
  })
})
