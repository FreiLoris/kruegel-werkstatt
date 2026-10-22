import { describe, expect, it } from 'vitest'
import { carriedLabel, carriedSince, showsCarriedOver } from './carriedOver'

describe('carried over (FB-14)', () => {
  it('since the day its appointment ended', () => {
    // fictitious: Monday 12.10.2026 until the next day
    expect(carriedSince({ endAt: '2026-10-13T12:00:00' })).toBe('2026-10-13')
    expect(carriedLabel({ endAt: '2026-10-12T17:00:00' })).toBe('verlängert seit Mo 12.10.')
    // until 24:00 is still Monday
    expect(carriedLabel({ endAt: '2026-10-13T00:00:00' })).toBe('verlängert seit Mo 12.10.')
  })

  it('only up to today', () => {
    expect(showsCarriedOver('2026-10-22', '2026-10-22')).toBe(true)
    expect(showsCarriedOver('2026-10-21', '2026-10-22')).toBe(true)
    expect(showsCarriedOver('2026-10-23', '2026-10-22')).toBe(false)
  })
})
