import { describe, expect, it } from 'vitest'
import type { Absence } from './absenceApi'
import { absencesOn } from './absenceDays'

const absence = (id: string, startDate: string, endDate: string, startsAfternoon = false, endsNoon = false) =>
  ({ id, startDate, endDate, startsAfternoon, endsNoon }) as Absence

describe('absencesOn', () => {
  const week = absence('ferien', '2026-10-12', '2026-10-16', true, true)

  it('the first day only from noon, the last only until noon, in between the whole day', () => {
    expect(absencesOn([week], '2026-10-12')[0].part).toBe('afternoon')
    expect(absencesOn([week], '2026-10-14')[0].part).toBe('full')
    expect(absencesOn([week], '2026-10-16')[0].part).toBe('morning')
    expect(absencesOn([week], '2026-10-17')).toEqual([])
  })

  it('morning before full day before afternoon', () => {
    const day = absencesOn(
      [absence('nachmittag', '2026-10-12', '2026-10-12', true), absence('ganz', '2026-10-12', '2026-10-12'), absence('vormittag', '2026-10-12', '2026-10-12', false, true)],
      '2026-10-12',
    )

    expect(day.map((d) => d.absence.id)).toEqual(['vormittag', 'ganz', 'nachmittag'])
  })
})
