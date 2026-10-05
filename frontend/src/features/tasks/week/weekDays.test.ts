import { describe, expect, it } from 'vitest'
import type { Task } from '../taskApi'
import { weekDays } from './weekDays'

const task = (id: string, date: string, time: string) => ({ id, date, time }) as Task
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
