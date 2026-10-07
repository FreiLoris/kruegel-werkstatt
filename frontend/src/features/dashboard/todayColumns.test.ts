import { describe, expect, it } from 'vitest'
import type { Lift } from '../lifts/liftApi'
import type { Task } from '../tasks/taskApi'
import { liftColumns, nextAppointment, NO_LIFT } from './todayColumns'

const lift = (id: string, active = true) => ({ id, name: `Lift ${id}`, active }) as Lift
const task = (id: string, liftId: string | null, time = '08:00', date = '2026-10-07') => ({ id, liftId, time, date }) as Task

describe('liftColumns', () => {
  it('every lift in service, also empty, in its order; within by start', () => {
    const columns = liftColumns([task('late', '1', '13:00'), task('early', '1', '07:30')], [lift('1'), lift('2')])

    expect(columns.map((c) => c.id)).toEqual(['1', '2'])
    expect(columns[0].tasks.map((t) => t.id)).toEqual(['early', 'late'])
    expect(columns[1].tasks).toEqual([])
  })

  it('a task from yesterday still on the lift comes first', () => {
    const columns = liftColumns([task('today', '1', '07:30'), task('yesterday', '1', '15:00', '2026-10-06')], [lift('1')])

    expect(columns[0].tasks.map((t) => t.id)).toEqual(['yesterday', 'today'])
  })

  it('"ohne Lift" and lifts out of service only when they have something today', () => {
    expect(liftColumns([], [lift('1'), lift('old', false)]).map((c) => c.id)).toEqual(['1'])

    const columns = liftColumns([task('a', 'old'), task('b', null)], [lift('1'), lift('old', false)])
    expect(columns.map((c) => c.id)).toEqual(['1', 'old', NO_LIFT])
  })
})

describe('nextAppointment', () => {
  it('the first one after today, not today', () => {
    const tasks = [task('today', '1', '07:00', '2026-10-07'), task('later', '1', '07:00', '2026-10-12'), task('next', '1', '15:00', '2026-10-09')]

    expect(nextAppointment(tasks, '2026-10-07')?.id).toBe('next')
    expect(nextAppointment([], '2026-10-07')).toBeUndefined()
  })
})
