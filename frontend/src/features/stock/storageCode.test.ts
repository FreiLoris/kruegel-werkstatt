import { describe, expect, it } from 'vitest'
import { CODE_PATTERN, normalizeCode, suggestCode } from './storageCode'

describe('storage codes (FB-23)', () => {
  it('typed in: upper case, no spaces – AA00 only', () => {
    expect(normalizeCode(' ka 01 ')).toBe('KA01')
    expect(CODE_PATTERN.test('KA01')).toBe(true)
    expect(CODE_PATTERN.test('K1')).toBe(false)
  })

  it('an area: its next free place', () => {
    expect(suggestCode('K', [])).toBe('KA01')
    expect(suggestCode('k', ['KA01', 'KA02'])).toBe('KB01')
  })

  it('a full area goes on with the next letter', () => {
    const full = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((second) => `K${second}01`)
    expect(suggestCode('K', full)).toBe('LA01')
  })

  it('a place: its next free number', () => {
    expect(suggestCode('KA', ['KA01', 'KA02', 'KA04'])).toBe('KA03')
    expect(suggestCode('KA07', ['KA01'])).toBe('KA02')
  })

  it('nothing typed: no proposal', () => {
    expect(suggestCode('', ['KA01'])).toBeNull()
    expect(suggestCode('1', [])).toBeNull()
  })
})
