import { describe, expect, it } from 'vitest'
import { FARBVORSCHLAEGE, freieFarbe, textAufFarbe } from './farben'

describe('textAufFarbe', () => {
  it('wählt dunkle Schrift auf hellen Farben', () => {
    expect(textAufFarbe('#ffffff')).toBe('dunkel')
    expect(textAufFarbe('#f6d860')).toBe('dunkel')
  })

  it('wählt helle Schrift auf dunklen Farben', () => {
    expect(textAufFarbe('#000000')).toBe('hell')
    expect(textAufFarbe('#1e3a8a')).toBe('hell')
  })

  it('akzeptiert Gross- und Kleinbuchstaben', () => {
    expect(textAufFarbe('#1E3A8A')).toBe('hell')
  })

  it('lehnt ungültige Farben ab', () => {
    expect(() => textAufFarbe('rot')).toThrow()
  })

  it('alle Vorschläge sind mit dunkler Schrift gut lesbar', () => {
    for (const farbe of FARBVORSCHLAEGE) {
      expect(textAufFarbe(farbe.wert), farbe.name).toBe('dunkel')
    }
  })
})

describe('freieFarbe', () => {
  it('nimmt die erste noch nicht vergebene Farbe', () => {
    expect(freieFarbe(['#F6D860', '#ffb366'])).toBe(FARBVORSCHLAEGE[2].wert)
  })

  it('fängt von vorne an, wenn alle vergeben sind', () => {
    expect(freieFarbe(FARBVORSCHLAEGE.map((f) => f.wert))).toBe(FARBVORSCHLAEGE[0].wert)
  })
})
