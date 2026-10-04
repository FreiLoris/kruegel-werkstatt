import { describe, expect, it } from 'vitest'
import { composePlate, groupDigits, parsePlate } from './licensePlate'

describe('parsePlate', () => {
  it('recognises Swiss plates', () => {
    expect(parsePlate('SG 197052')).toEqual({ kind: 'swiss', canton: 'SG', number: '197052' })
  })

  it('GR with digits is Graubünden, with letters Greece', () => {
    expect(parsePlate('GR 12345').kind).toBe('swiss')
    expect(parsePlate('GR ABC-1234')).toEqual({ kind: 'foreign', country: 'GR', number: 'ABC-1234' })
  })

  it('recognises foreign plates by their country code', () => {
    expect(parsePlate('D M-AB 1234')).toEqual({ kind: 'foreign', country: 'D', number: 'M-AB 1234' })
  })

  it('keeps everything else as typed', () => {
    expect(parsePlate('XX123')).toEqual({ kind: 'other', text: 'XX123' })
  })
})

describe('composePlate', () => {
  it('builds the stored text from the parts', () => {
    expect(composePlate({ kind: 'swiss', canton: 'SG', number: '197 052' })).toBe('SG 197052')
    expect(composePlate({ kind: 'foreign', country: 'D', number: ' m-ab   1234 ' })).toBe('D M-AB 1234')
  })

  it('without number there is no plate', () => {
    expect(composePlate({ kind: 'swiss', canton: 'SG', number: '' })).toBe('')
  })

  it('parse and compose are inverse', () => {
    for (const text of ['ZH 123456', 'D M-AB 1234', 'FL 12345']) {
      expect(composePlate(parsePlate(text))).toBe(text)
    }
  })
})

describe('groupDigits', () => {
  it('groups like the real plate', () => {
    expect(groupDigits('197052')).toBe('197 052')
    expect(groupDigits('12345')).toBe('12 345')
    expect(groupDigits('123')).toBe('123')
  })
})
