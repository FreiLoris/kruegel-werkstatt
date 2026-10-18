import { describe, expect, it } from 'vitest'
import { fold, matchesAll, searchWords } from './search'

describe('search', () => {
  it('forgives umlauts, accents, ae/oe/ue and hyphens – as typed on any keyboard (UX G-04)', () => {
    // fictitious names
    // the plate also without spaces – as the searches pass it
    const customer = ['Hübscher-Yılmaz Françoise', 'Bösingen', 'ZH 445566', 'ZH445566']
    for (const typed of ['hubscher', 'Huebscher', 'yilmaz', 'francoise', 'boesingen', 'ZH-445', 'hubscheryilmaz']) {
      expect(matchesAll(searchWords(typed), customer), typed).toBe(true)
    }
    expect(matchesAll(searchWords('meier'), customer)).toBe(false)
  })

  it('every word must occur, in any order', () => {
    expect(matchesAll(searchWords('filter vw'), ['Ölfilter', 'für VW'])).toBe(true)
    expect(matchesAll(searchWords('oelfilter'), ['Ölfilter'])).toBe(true)
    expect(matchesAll(searchWords('filter audi'), ['Ölfilter', 'für VW'])).toBe(false)
  })

  it('no words find everything', () => {
    expect(searchWords('   ')).toEqual([])
    expect(matchesAll([], ['x'])).toBe(true)
    expect(fold('Straße')).toBe('strasse')
  })
})
