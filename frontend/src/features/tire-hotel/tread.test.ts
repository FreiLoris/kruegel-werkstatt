import { describe, expect, it } from 'vitest'
import { formatDepth, olderDepths, treadStatus, wheelsToAdvise, worstStatus } from './tread'
import type { TireSetEvent, TreadDepths } from './tireHotelApi'

const limits = { version: 0, summerMm: 3, winterMm: 4, minimumMm: 1.6 }

describe('treadStatus', () => {
  it('by the limit of the season – all-season like winter', () => {
    expect(treadStatus(3.5, 'SUMMER', limits)).toBe('ok')
    expect(treadStatus(3.5, 'WINTER', limits)).toBe('advise')
    expect(treadStatus(3.5, 'ALL_SEASON', limits)).toBe('advise')
    expect(treadStatus(4, 'WINTER', limits)).toBe('ok')
  })

  it('below the legal minimum, or not measured', () => {
    expect(treadStatus(1.5, 'SUMMER', limits)).toBe('illegal')
    expect(treadStatus(1.6, 'SUMMER', limits)).toBe('advise')
    expect(treadStatus(null, 'SUMMER', limits)).toBe('unknown')
  })
})

describe('a set', () => {
  const depths = { frontLeft: 3.5, frontRight: 5, rearLeft: null, rearRight: 1.2 }

  it('the worst wheel counts; the wheels to talk about', () => {
    expect(worstStatus(depths, 'WINTER', limits)).toBe('illegal')
    expect(worstStatus({ frontLeft: null, frontRight: null, rearLeft: null, rearRight: null }, 'WINTER', limits)).toBe('unknown')
    expect(wheelsToAdvise(depths, 'WINTER', limits)).toEqual(['VL', 'HR'])
    expect(wheelsToAdvise(depths, 'SUMMER', limits)).toEqual(['HR'])
  })

  it('depths for people', () => {
    expect(formatDepth(6.5)).toBe('6,5 mm')
    expect(formatDepth(4)).toBe('4,0 mm')
    expect(formatDepth(null)).toBe('–')
  })
})

describe('olderDepths', () => {
  const event = (kind: TireSetEvent['kind'], happenedOn: string, depths: Partial<TreadDepths>) =>
    ({ kind, happenedOn, depths: { frontLeft: null, frontRight: null, rearLeft: null, rearRight: null, ...depths } }) as TireSetEvent

  it('names the wheels not measured with the latest measurement and the day of their value', () => {
    const history = [
      event('STORED', '2026-04-01', { frontLeft: 5, frontRight: 5, rearLeft: 5, rearRight: 5 }),
      event('MEASURED', '2026-10-01', { frontLeft: 3.5, frontRight: 3.4 }),
      // a retrieval repeats the depths of that moment – not a measurement
      event('RETRIEVED', '2026-10-02', { frontLeft: 3.5, frontRight: 3.4, rearLeft: 5, rearRight: 5 }),
    ]

    expect(olderDepths(history)).toEqual([{ wheels: ['HL', 'HR'], on: '2026-04-01' }])
  })

  it('nothing to say when all four were measured together', () => {
    expect(olderDepths([event('MEASURED', '2026-10-01', { frontLeft: 4, frontRight: 4, rearLeft: 4, rearRight: 4 })])).toEqual([])
  })
})
