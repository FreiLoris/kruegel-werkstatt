import { describe, expect, it } from 'vitest'
import type { TireSet } from './tireHotelApi'
import { tireOverview } from './tireOverview'

// fictitious sets of one car
const set = (id: string, season: string, measuredOn: string, more: Partial<TireSet> = {}) =>
  ({ id, season, measuredOn, storedOn: null, retrievedOn: null, updatedAt: '2026-10-20T08:00:00Z', ...more }) as TireSet

describe('tireOverview (FB-12)', () => {
  it('per season the set used last, summer first; the older ones counted', () => {
    const overview = tireOverview([
      // its remark corrected today – still the old one
      set('w-old', 'WINTER', '2023-10-01', { updatedAt: '2026-10-23T08:00:00Z' }),
      set('w', 'WINTER', '2026-04-01'),
      set('s', 'SUMMER', '2026-10-15'),
    ])

    expect(overview.map((t) => [t.season, t.set.id, t.older])).toEqual([
      ['SUMMER', 's', 0],
      ['WINTER', 'w', 1],
    ])
  })

  it('no sets, nothing to show', () => {
    expect(tireOverview([])).toEqual([])
  })
})
