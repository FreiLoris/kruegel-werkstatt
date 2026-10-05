import { describe, expect, it } from 'vitest'
import type { Lift } from '../../lifts/liftApi'
import type { Task } from '../taskApi'
import { applyArrangement, arrangementOf, columnOf, dayColumns, moveTask, NO_LIFT } from './dayColumns'

const lift = (id: string, name: string, active = true) => ({ id, name, active }) as Lift
const task = (id: string, liftId: string | null, sortOrder: number, time = '08:00:00') => ({ id, liftId, sortOrder, time }) as Task

describe('dayColumns', () => {
  it('active lifts in order, "Ohne Lift" always last, manual order inside', () => {
    const columns = dayColumns(
      [task('b', 'l1', 1, '07:00:00'), task('a', 'l1', 0, '10:00:00'), task('x', null, 0)],
      [lift('l1', 'Lift 1'), lift('l2', 'Lift 2')],
    )

    expect(columns.map((c) => c.title)).toEqual(['Lift 1', 'Lift 2', 'Ohne Lift'])
    // position counts, not the time
    expect(columns[0].tasks.map((t) => t.id)).toEqual(['a', 'b'])
    expect(columns[2].tasks.map((t) => t.id)).toEqual(['x'])
  })

  it('a lift out of service only appears while it still has tasks', () => {
    const lifts = [lift('l1', 'Lift 1'), lift('old', 'Grube', false)]

    expect(dayColumns([], lifts).map((c) => c.id)).toEqual(['l1', NO_LIFT])
    expect(dayColumns([task('t', 'old', 0)], lifts).map((c) => c.title)).toEqual(['Lift 1', 'Grube (ausser Betrieb)', 'Ohne Lift'])
  })
})

describe('moveTask', () => {
  const start = { l1: ['a', 'b', 'c'], l2: ['x'], [NO_LIFT]: [] }

  it('within a column', () => {
    expect(moveTask(start, 'c', 'l1', 0).l1).toEqual(['c', 'a', 'b'])
  })

  it('into another column, the old one closes the gap', () => {
    const moved = moveTask(start, 'a', 'l2', 1)

    expect(moved.l1).toEqual(['b', 'c'])
    expect(moved.l2).toEqual(['x', 'a'])
    expect(columnOf(moved, 'a')).toBe('l2')
  })

  it('leaves the original untouched', () => {
    moveTask(start, 'a', NO_LIFT, 0)

    expect(start.l1).toEqual(['a', 'b', 'c'])
  })

  it('arrangement from columns', () => {
    expect(arrangementOf(dayColumns([task('a', 'l1', 0)], [lift('l1', 'Lift 1')]))).toEqual({ l1: ['a'], [NO_LIFT]: [] })
  })
})

describe('applyArrangement', () => {
  it('sets lift and position of every task', () => {
    const tasks = [task('a', 'l1', 0), task('b', 'l1', 1)]

    expect(applyArrangement(tasks, { l1: ['b'], [NO_LIFT]: ['a'] })).toMatchObject([
      { id: 'a', liftId: null, sortOrder: 0 },
      { id: 'b', liftId: 'l1', sortOrder: 0 },
    ])
  })
})
