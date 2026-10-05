import { describe, expect, it } from 'vitest'
import type { Lift } from '../../lifts/liftApi'
import type { Task } from '../taskApi'
import { dayColumns, NO_LIFT } from './dayColumns'

const lift = (id: string, name: string, active = true) => ({ id, name, active }) as Lift
const task = (id: string, liftId: string | null, time = '08:00:00', date = '2026-10-15') => ({ id, liftId, time, date }) as Task

describe('dayColumns', () => {
  it('active lifts in order, "Ohne Lift" always last, by start inside', () => {
    const columns = dayColumns(
      [task('late', 'l1', '10:00:00'), task('early', 'l1', '07:00:00'), task('yesterday', 'l1', '15:00:00', '2026-10-14'), task('x', null)],
      [lift('l1', 'Lift 1'), lift('l2', 'Lift 2')],
    )

    expect(columns.map((c) => c.title)).toEqual(['Lift 1', 'Lift 2', 'Ohne Lift'])
    expect(columns[0].tasks.map((t) => t.id)).toEqual(['yesterday', 'early', 'late'])
    expect(columns[2].tasks.map((t) => t.id)).toEqual(['x'])
  })

  it('a lift out of service only appears while it still has tasks', () => {
    const lifts = [lift('l1', 'Lift 1'), lift('old', 'Grube', false)]

    expect(dayColumns([], lifts).map((c) => c.id)).toEqual(['l1', NO_LIFT])
    expect(dayColumns([task('t', 'old')], lifts).map((c) => c.title)).toEqual(['Lift 1', 'Grube (ausser Betrieb)', 'Ohne Lift'])
  })
})
