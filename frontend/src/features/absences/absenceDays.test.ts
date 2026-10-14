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

  it('times (FB-05) only on the first and last day, in the half of the day they lie in', () => {
    const course = { ...absence('kurs', '2026-10-12', '2026-10-14'), startTime: '14:00:00', endTime: '10:30:00' } as Absence
    const doctor = { ...absence('arzt', '2026-10-15', '2026-10-15'), startTime: '09:00:00', endTime: '13:00:00' } as Absence

    expect(absencesOn([course], '2026-10-12')[0]).toMatchObject({ part: 'afternoon', time: 'ab 14:00' })
    expect(absencesOn([course], '2026-10-13')[0]).toMatchObject({ part: 'full', time: null })
    expect(absencesOn([course], '2026-10-14')[0]).toMatchObject({ part: 'morning', time: 'bis 10:30' })
    // over noon: both halves
    expect(absencesOn([doctor], '2026-10-15')[0]).toMatchObject({ part: 'full', time: '09:00–13:00' })
  })
})
