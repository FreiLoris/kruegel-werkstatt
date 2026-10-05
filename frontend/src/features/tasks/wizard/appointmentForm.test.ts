import { describe, expect, it } from 'vitest'
import type { Customer, Vehicle } from '../../customers/customerSearchApi'
import type { Task } from '../taskApi'
import {
  appointmentErrors,
  customerStepFromTask,
  EMPTY_APPOINTMENT,
  formFromTask,
  toTaskRequest,
  withArrivesEarlier,
  withDate,
  withMfk,
  withReadyBy,
  type AppointmentForm,
} from './appointmentForm'

const NO_HOLIDAYS = new Set<string>()
// Thursday
const THURSDAY: AppointmentForm = { ...EMPTY_APPOINTMENT, date: '2026-10-15', time: '08:00' }

describe('defaults', () => {
  it('arrives earlier = evening of the previous working day', () => {
    expect(withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS)).toMatchObject({ arrivesEarlierDate: '2026-10-14', arrivesEarlierTime: '17:00' })
    // Monday → Friday
    expect(withArrivesEarlier({ ...THURSDAY, date: '2026-10-19' }, true, NO_HOLIDAYS).arrivesEarlierDate).toBe('2026-10-16')
  })

  it('ready by = same evening, next day for a late appointment', () => {
    expect(withReadyBy(THURSDAY, true)).toMatchObject({ readyByDate: '2026-10-15', readyByTime: '17:00' })
    expect(withReadyBy({ ...THURSDAY, time: '17:30' }, true).readyByDate).toBe('2026-10-16')
  })

  it('MFK on the day of the appointment', () => {
    expect(withMfk(THURSDAY, true).mfkDate).toBe('2026-10-15')
  })
})

describe('withDate', () => {
  it('derived dates move along with the appointment', () => {
    let form = withMfk(withReadyBy(withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS), true), true)

    form = withDate(form, '2026-10-20', '09:00', NO_HOLIDAYS)

    expect(form).toMatchObject({ date: '2026-10-20', time: '09:00', arrivesEarlierDate: '2026-10-19', readyByDate: '2026-10-20', mfkDate: '2026-10-20' })
  })

  it('dates set by hand stay', () => {
    const form = { ...withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS), arrivesEarlierDate: '2026-10-12' }

    expect(withDate(form, '2026-10-20', '09:00', NO_HOLIDAYS).arrivesEarlierDate).toBe('2026-10-12')
  })
})

describe('appointmentErrors', () => {
  it('needs a date', () => {
    expect(appointmentErrors(EMPTY_APPOINTMENT).date).toBeDefined()
    expect(appointmentErrors(THURSDAY)).toEqual({})
  })

  it('arrives earlier before, ready by after the appointment', () => {
    const form = { ...THURSDAY, arrivesEarlier: true, arrivesEarlierDate: '2026-10-15', arrivesEarlierTime: '09:00',
      readyBy: true, readyByDate: '2026-10-15', readyByTime: '07:00' }

    expect(appointmentErrors(form)).toMatchObject({ arrivesEarlierDate: 'muss vor dem Termin liegen', readyByDate: 'muss nach dem Termin liegen' })
  })

  it('parts need a description', () => {
    expect(appointmentErrors({ ...THURSDAY, parts: true }).partsDescription).toBeDefined()
  })
})

describe('toTaskRequest', () => {
  const customer = { id: 'c1' } as Customer
  const vehicle = { id: 'v1' } as Vehicle

  it('maps the ticked options and leaves the rest out', () => {
    const form: AppointmentForm = {
      ...THURSDAY,
      arrivesEarlier: true,
      arrivesEarlierDate: '2026-10-14',
      arrivesEarlierTime: '17:00',
      tireChange: true,
      tireChangeKind: 'WHEELS_STORED',
      mfk: true,
      mfkDate: '2026-10-15',
      mfkTime: '',
      parts: false,
      partsDescription: 'vergessen',
      liftId: 'l1',
      workDescription: '  ',
    }

    expect(toTaskRequest({ customer, vehicle: { kind: 'vehicle', vehicle } }, form)).toEqual({
      customerId: 'c1',
      vehicleId: 'v1',
      date: '2026-10-15',
      time: '08:00',
      arrivesEarlier: '2026-10-14T17:00',
      readyBy: undefined,
      waitingCustomer: false,
      mechanicId: undefined,
      liftId: 'l1',
      tireChange: true,
      tireChangeKind: 'WHEELS_STORED',
      mfk: true,
      // MFK date without time: the appointment at the station is not known yet
      mfkAppointment: undefined,
      serviceItemIds: [],
      parts: undefined,
      workDescription: undefined,
      notes: undefined,
      version: undefined,
    })
  })

  it('vehicle still open → no vehicle', () => {
    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, THURSDAY).vehicleId).toBeUndefined()
  })
})

describe('formFromTask', () => {
  const task = {
    customer: { id: 'c1' },
    vehicle: null,
    date: '2026-10-15',
    time: '08:00:00',
    arrivesEarlier: '2026-10-14T17:00:00',
    readyBy: null,
    waitingCustomer: true,
    mechanicId: 'm1',
    liftId: null,
    tireChange: true,
    tireChangeKind: 'WHEELS_STORED',
    mfk: true,
    mfkAppointment: '2026-10-15T10:30:00',
    serviceItemIds: ['oil'],
    parts: { description: 'Bremsscheiben', status: 'ORDERED', supplier: 'Derendinger', orderedOn: null },
    workDescription: 'Geräusch',
    notes: null,
  } as unknown as Task

  it('fills the form so that saving gives the same task back', () => {
    const form = formFromTask(task)
    const request = toTaskRequest(customerStepFromTask(task), form, 3)

    expect(request).toMatchObject({
      customerId: 'c1',
      vehicleId: undefined,
      date: '2026-10-15',
      time: '08:00',
      arrivesEarlier: '2026-10-14T17:00',
      waitingCustomer: true,
      mechanicId: 'm1',
      liftId: undefined,
      tireChangeKind: 'WHEELS_STORED',
      mfkAppointment: '2026-10-15T10:30',
      serviceItemIds: ['oil'],
      parts: { description: 'Bremsscheiben', status: 'ORDERED', supplier: 'Derendinger', orderedOn: undefined },
      workDescription: 'Geräusch',
      notes: undefined,
      version: 3,
    })
  })

  it('a task without vehicle stays "vehicle open"', () => {
    expect(customerStepFromTask(task).vehicle).toEqual({ kind: 'open' })
  })
})
