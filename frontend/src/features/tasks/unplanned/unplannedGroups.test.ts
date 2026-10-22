import { describe, expect, it } from 'vitest'
import type { AnyTask } from '../taskApi'
import type { ShoppingItem } from '../../shopping/shoppingApi'
import { partsByTask, unplannedCount, unplannedGroups } from './unplannedGroups'

// fictitious
const task = (id: string, more: Partial<AnyTask> = {}) =>
  ({ id, status: 'RECEIVED', date: null, createdAt: '2026-10-01T08:00:00Z', ...more }) as AnyTask

describe('unplannedGroups', () => {
  it('waiting for parts in a group of their own – with a day over or without a day (FB-15)', () => {
    const open = task('open')
    const waitingNoDay = task('w1', { status: 'WAITING_FOR_PARTS', createdAt: '2026-10-05T08:00:00Z' })
    const waitingDayOver = task('w2', { status: 'WAITING_FOR_PARTS', date: '2026-10-02' })

    const groups = unplannedGroups([open, waitingNoDay], [waitingDayOver])

    expect(groups.withoutAppointment.map((t) => t.id)).toEqual(['open'])
    // the longest waiting first
    expect(groups.waitingForParts.map((t) => t.id)).toEqual(['w2', 'w1'])
  })

  it('all parts arrived first: these can be planned now', () => {
    const waiting = task('w1', { status: 'WAITING_FOR_PARTS', date: '2026-10-02' })
    const arrived = task('w2', { status: 'WAITING_FOR_PARTS', date: '2026-10-09' })
    const parts = new Map([['w2', { missing: [], arrived: true }]])
    expect(unplannedGroups([], [waiting, arrived], parts).waitingForParts.map((t) => t.id)).toEqual(['w2', 'w1'])
  })
})

describe('partsByTask (FB-19)', () => {
  const item = (taskId: string | null, description: string, status: ShoppingItem['status'], quantity = 1) =>
    ({ description, quantity, status, task: taskId && { id: taskId } }) as ShoppingItem

  it('what is missing per task; all arrived only when nothing is missing', () => {
    const parts = partsByTask([
      item('t1', 'Bremsscheiben', 'ORDERED', 2),
      item(null, 'Kaffee', 'TO_ORDER'),
      item('t1', 'Beläge', 'ARRIVED'),
      item('t2', 'Kupplungssatz', 'ARRIVED'),
    ])

    expect(parts.get('t1')).toEqual({ missing: ['2× Bremsscheiben'], arrived: false })
    expect(parts.get('t2')).toEqual({ missing: [], arrived: true })
    expect(parts.has('t3')).toBe(false)
  })
})

describe('unplannedCount', () => {
  it('counts both separately, leaves out what is empty', () => {
    const groups = unplannedGroups([task('a'), task('b')], [task('w', { status: 'WAITING_FOR_PARTS', date: '2026-10-02' })])
    expect(unplannedCount(groups)).toBe('2 ohne Termin · 1 wartet auf Material')
    expect(unplannedCount(unplannedGroups([task('a')], []))).toBe('1 ohne Termin')
    expect(unplannedCount(unplannedGroups([], []))).toBe('')
  })
})
