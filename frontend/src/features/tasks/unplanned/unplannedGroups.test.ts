import { describe, expect, it } from 'vitest'
import type { AnyTask } from '../taskApi'
import { unplannedCount, unplannedGroups } from './unplannedGroups'

// fictitious
const task = (id: string, more: Partial<AnyTask> = {}) =>
  ({ id, status: 'RECEIVED', date: null, parts: null, createdAt: '2026-10-01T08:00:00Z', ...more }) as AnyTask

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

  it('parts arrived first: these can be planned now', () => {
    const waiting = task('w1', { status: 'WAITING_FOR_PARTS', date: '2026-10-02' })
    const arrived = task('w2', {
      status: 'WAITING_FOR_PARTS',
      date: '2026-10-09',
      parts: { description: 'Bremsscheiben', status: 'ARRIVED', supplier: null, orderedOn: null },
    })
    expect(unplannedGroups([], [waiting, arrived]).waitingForParts.map((t) => t.id)).toEqual(['w2', 'w1'])
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
