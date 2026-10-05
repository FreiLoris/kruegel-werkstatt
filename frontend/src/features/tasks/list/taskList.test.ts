import { describe, expect, it } from 'vitest'
import type { Employee } from '../../employees/employeeApi'
import type { Lift } from '../../lifts/liftApi'
import type { Task } from '../taskApi'
import { filterTasks, periodDays, periodPresets, sortTasks } from './taskList'

const task = (id: string, extra: Partial<Task> = {}) =>
  ({
    id,
    date: '2026-10-15',
    time: '08:00:00',
    status: 'RECEIVED',
    mechanicId: null,
    liftId: null,
    taskNumber: null,
    customer: { displayName: id },
    vehicle: null,
    ...extra,
  }) as Task

const lookups = {
  employees: [{ id: 'm1', name: 'Reto' }, { id: 'm2', name: 'Erich' }] as Employee[],
  lifts: [] as Lift[],
}

describe('periods', () => {
  it('this week runs Monday to Sunday', () => {
    expect(periodPresets('2026-10-15')[1]).toEqual({ label: 'Diese Woche', from: '2026-10-12', to: '2026-10-18' })
  })

  it('counts days inclusive', () => {
    expect(periodDays({ from: '2026-10-15', to: '2026-10-15' })).toBe(1)
    expect(periodDays({ from: '2026-10-01', to: '2026-10-31' })).toBe(31)
  })
})

describe('filterTasks', () => {
  const tasks = [
    task('Huber', { status: 'DONE', mechanicId: 'm1', vehicle: { licensePlate: 'ZH 123456', description: 'VW Golf' } as Task['vehicle'] }),
    task('Meier', { status: 'IN_PROGRESS', mechanicId: 'm2' }),
  ]
  const noWork = () => ''

  it('by status and mechanic', () => {
    expect(filterTasks(tasks, { statuses: ['IN_PROGRESS'], mechanicId: '', text: '' }, noWork).map((t) => t.id)).toEqual(['Meier'])
    expect(filterTasks(tasks, { statuses: [], mechanicId: 'm1', text: '' }, noWork).map((t) => t.id)).toEqual(['Huber'])
  })

  it('every word must occur – plate also without space, work too', () => {
    expect(filterTasks(tasks, { statuses: [], mechanicId: '', text: 'zh123 golf' }, noWork).map((t) => t.id)).toEqual(['Huber'])
    expect(filterTasks(tasks, { statuses: [], mechanicId: '', text: 'bremsen' }, (t) => (t.id === 'Meier' ? 'Bremsen' : '')).map((t) => t.id)).toEqual([
      'Meier',
    ])
  })
})

describe('sortTasks', () => {
  it('by appointment', () => {
    const tasks = [task('late', { time: '13:00:00' }), task('early', { time: '07:30:00' }), task('tomorrow', { date: '2026-10-16' })]

    expect(sortTasks(tasks, 'date', 'asc', lookups).map((t) => t.id)).toEqual(['early', 'late', 'tomorrow'])
    expect(sortTasks(tasks, 'date', 'desc', lookups).map((t) => t.id)).toEqual(['tomorrow', 'late', 'early'])
  })

  it('status in its natural order, not alphabetical', () => {
    const tasks = [task('d', { status: 'DONE' }), task('r', { status: 'RECEIVED' }), task('w', { status: 'WAITING_FOR_PARTS' })]

    expect(sortTasks(tasks, 'status', 'asc', lookups).map((t) => t.id)).toEqual(['r', 'w', 'd'])
  })

  it('empty values last in both directions', () => {
    const tasks = [task('none'), task('reto', { mechanicId: 'm1' }), task('erich', { mechanicId: 'm2' })]

    expect(sortTasks(tasks, 'mechanic', 'asc', lookups).map((t) => t.id)).toEqual(['erich', 'reto', 'none'])
    expect(sortTasks(tasks, 'mechanic', 'desc', lookups).map((t) => t.id)).toEqual(['reto', 'erich', 'none'])
  })
})
