import { describe, expect, it } from 'vitest'
import type { TireSet } from '../../tire-hotel/tireHotelApi'
import type { AnyTask } from '../taskApi'
import { openTireChangesElsewhere, tireAppointmentUrl, tireChangeKindOf } from './tireAppointment'

// fictitious
const task = (id: string, date: string | null, more: Partial<AnyTask> = {}) =>
  ({ id, date, vehicle: { id: 'golf' }, status: 'RECEIVED', tireChange: true, ...more }) as unknown as AnyTask
const set = (state: TireSet['state'], kind: TireSet['kind']) => ({ state, kind }) as TireSet

describe('tireChangeKindOf (FB-18)', () => {
  it('from the hotel "eingelagert", from the customer "mitgebracht" – wheels or tyres as the set', () => {
    expect(tireChangeKindOf(set('IN_HOTEL', 'WHEELS'))).toBe('WHEELS_STORED')
    expect(tireChangeKindOf(set('IN_HOTEL', 'TIRES'))).toBe('TIRES_STORED')
    expect(tireChangeKindOf(set('WITH_CUSTOMER', 'WHEELS'))).toBe('WHEELS_BROUGHT')
    expect(tireChangeKindOf(set('WITH_CUSTOMER', 'TIRES'))).toBe('TIRES_BROUGHT')
  })

  it('a set on the car comes off – the kind is still open', () => {
    expect(tireChangeKindOf(set('MOUNTED', 'WHEELS'))).toBe('')
  })
})

describe('openTireChangesElsewhere (FB-18)', () => {
  const tasks = [
    task('next-week', '2026-10-30'),
    task('chosen-day', '2026-10-26'),
    task('unplanned', null),
    task('service', '2026-11-02', { tireChange: false }),
    task('done', '2026-10-20', { status: 'DONE' }),
    task('other-car', '2026-10-30', { vehicle: { id: 'polo' } } as Partial<AnyTask>),
  ]

  it('the open tyre changes on other days – the chosen day and "Ohne Termin" are listed already', () => {
    expect(openTireChangesElsewhere(tasks, 'golf', '2026-10-26').map((t) => t.id)).toEqual(['next-week'])
  })

  it('no day chosen yet: every planned one', () => {
    expect(openTireChangesElsewhere(tasks, 'golf', '').map((t) => t.id)).toEqual(['next-week', 'chosen-day'])
  })

  it('leaves out the task being edited', () => {
    expect(openTireChangesElsewhere(tasks, 'golf', '', 'next-week').map((t) => t.id)).toEqual(['chosen-day'])
  })

  it('a link the wizard understands', () => {
    expect(tireAppointmentUrl('s 1')).toBe('/tasks/new?tireSet=s%201')
  })
})
