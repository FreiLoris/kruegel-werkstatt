import { describe, expect, it } from 'vitest'
import type { Task } from '../taskApi'
import { weekDays, withDate } from './weekDays'

const task = (id: string, date: string, time: string, sortOrder = 0) =>
  ({ id, date, time, sortOrder, endAt: `${date}T${time}`, arrivesEarlier: null, readyBy: null }) as Task
// Monday
const MONDAY = '2026-10-12'

describe('weekDays', () => {
  it('Monday to Friday, weekend only with tasks', () => {
    expect(weekDays(MONDAY, []).map((d) => d.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'])
    expect(weekDays(MONDAY, [task('s', '2026-10-17', '09:00:00')]).map((d) => d.date)).toContain('2026-10-17')
  })

  it('sorts a day by time', () => {
    const days = weekDays(MONDAY, [task('late', MONDAY, '13:00:00'), task('early', MONDAY, '07:30:00')])

    expect(days[0].tasks.map((t) => t.id)).toEqual(['early', 'late'])
  })
})

describe('withDate', () => {
  it('moves only the one task', () => {
    const moved = withDate([task('a', MONDAY, '08:00:00'), task('b', MONDAY, '09:00:00')], 'a', '2026-10-14')

    expect(moved.map((t) => t.date)).toEqual(['2026-10-14', MONDAY])
  })

  it('end and extra times move along by the same days', () => {
    const waiting = { ...task('a', MONDAY, '08:00:00'), endAt: '2026-10-13T12:00:00', readyBy: '2026-10-13T16:00:00' }

    expect(withDate([waiting], 'a', '2026-10-15')[0]).toMatchObject({
      endAt: '2026-10-16T12:00:00',
      readyBy: '2026-10-16T16:00:00',
      arrivesEarlier: null,
    })
  })
})
