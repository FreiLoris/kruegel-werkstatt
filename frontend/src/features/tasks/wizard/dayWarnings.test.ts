import { describe, expect, it } from 'vitest'
import type { Absence } from '../../absences/absenceApi'
import type { Employee } from '../../employees/employeeApi'
import type { Lift } from '../../lifts/liftApi'
import type { Task } from '../taskApi'
import { EMPTY_APPOINTMENT, type AppointmentForm } from './appointmentForm'
import { dayWarnings } from './dayWarnings'

const TODAY = '2026-10-14' // a Wednesday
const form = (changes: Partial<AppointmentForm>): AppointmentForm => ({
  ...EMPTY_APPOINTMENT,
  date: '2026-10-15',
  time: '08:00',
  endDate: '2026-10-15',
  endTime: '10:00',
  workDescription: 'Bremsen',
  ...changes,
})
const context = { today: TODAY, holidays: new Map<string, string>() }

describe('dayWarnings (UX M-01, M-02)', () => {
  it('nothing to say about an ordinary day with work', () => {
    expect(dayWarnings(form({}), context)).toEqual([])
  })

  it('past, weekend and holiday', () => {
    expect(dayWarnings(form({ date: '2026-10-13' }), context)[0]).toContain('Vergangenheit')
    expect(dayWarnings(form({ date: '2026-10-17' }), context)[0]).toContain('Samstag')
    expect(dayWarnings(form({ date: '2026-10-18' }), context)[0]).toContain('Sonntag')
    expect(dayWarnings(form({}), { ...context, holidays: new Map([['2026-10-15', 'Testfeiertag']]) })[0]).toContain('Testfeiertag')
  })

  it('the mechanic away – not when they said they are in', () => {
    const employees = [{ id: 'e1', name: 'Reto' }] as Employee[]
    const away = (category: string) =>
      [{ id: 'a1', employeeId: 'e1', category, startDate: '2026-10-15', endDate: '2026-10-15' }] as Absence[]
    expect(dayWarnings(form({ mechanicId: 'e1' }), { ...context, employees, absences: away('VACATION') })[0]).toContain('Reto ist an diesem Tag nicht da (Ferien')
    expect(dayWarnings(form({ mechanicId: 'e1' }), { ...context, employees, absences: away('PRESENT') })).toEqual([])
  })

  it('the lift taken at that time – with time and customer; touching ends are fine', () => {
    const lifts = [{ id: 'l1', name: 'Lift 1' }] as Lift[]
    const task = (id: string, time: string, endAt: string) =>
      ({ id, liftId: 'l1', date: '2026-10-15', time, endAt, customer: { displayName: 'Muster Hans' } }) as Task
    const taken = { ...context, lifts, tasksOfDay: [task('t1', '09:00:00', '2026-10-15T12:00:00')] }
    expect(dayWarnings(form({ liftId: 'l1' }), taken)[0]).toBe('Lift 1 ist 09:00–12:00 belegt (Muster Hans) – andere Zeit oder anderer Lift?')
    expect(dayWarnings(form({ liftId: 'l1', endTime: '09:00' }), taken)).toEqual([])
    // editing: the task itself
    expect(dayWarnings(form({ liftId: 'l1' }), { ...taken, taskId: 't1' })).toEqual([])
  })

  it('no work at all', () => {
    expect(dayWarnings(form({ workDescription: '' }), context)).toEqual(['Noch keine Arbeit angegeben – was soll gemacht werden?'])
  })
})
