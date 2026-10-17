import { describe, expect, it } from 'vitest'
import type { Customer, Vehicle } from '../../customers/customerSearchApi'
import type { AnyTask, Task } from '../taskApi'
import {
  appointmentErrors,
  appointmentMinutes,
  customerStepFromTask,
  EMPTY_APPOINTMENT,
  formFromTask,
  mfkBeforeEnd,
  newTaskUrl,
  slotFromUrl,
  toTaskRequest,
  withArrivesEarlier,
  withDate,
  withMfk,
  withMfkStation,
  withReadyBy,
  withService,
  withSlot,
  type AppointmentForm,
} from './appointmentForm'

const NO_HOLIDAYS = new Set<string>()
// Thursday
const THURSDAY: AppointmentForm = { ...EMPTY_APPOINTMENT, acceptedById: 'r', date: '2026-10-15', time: '08:00', endDate: '2026-10-15', endTime: '09:00' }

describe('defaults', () => {
  it('arrives earlier = the day of the appointment when the workshop opens', () => {
    expect(withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS)).toMatchObject({ arrivesEarlierDate: '2026-10-15', arrivesEarlierTime: '07:00' })
    expect(appointmentErrors(withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS))).toEqual({})
  })

  it('an appointment at opening time leaves no "earlier" that day: the evening of the previous working day', () => {
    const atOpening = { ...THURSDAY, time: '07:00', endTime: '08:00' }

    expect(withArrivesEarlier(atOpening, true, NO_HOLIDAYS)).toMatchObject({ arrivesEarlierDate: '2026-10-14', arrivesEarlierTime: '17:00' })
    // Monday → Friday
    expect(withArrivesEarlier({ ...atOpening, date: '2026-10-19' }, true, NO_HOLIDAYS).arrivesEarlierDate).toBe('2026-10-16')
    expect(appointmentErrors(withArrivesEarlier(atOpening, true, NO_HOLIDAYS))).toEqual({})
  })

  it('a date typed before stays when "kommt früher" is ticked again', () => {
    const typed = { ...THURSDAY, arrivesEarlierDate: '2026-10-13', arrivesEarlierTime: '16:00' }

    expect(withArrivesEarlier(typed, true, NO_HOLIDAYS)).toMatchObject({ arrivesEarlier: true, arrivesEarlierDate: '2026-10-13', arrivesEarlierTime: '16:00' })
  })

  it('ready by = the day of the appointment at closing time (17:30), next day for a late appointment', () => {
    expect(withReadyBy(THURSDAY, true)).toMatchObject({ readyByDate: '2026-10-15', readyByTime: '17:30' })
    // 17:15 still leaves the same evening, an appointment at closing time does not
    expect(withReadyBy({ ...THURSDAY, time: '17:15' }, true).readyByDate).toBe('2026-10-15')
    expect(withReadyBy({ ...THURSDAY, time: '17:30' }, true).readyByDate).toBe('2026-10-16')
  })

  it('the preset "ready by" is valid as it stands', () => {
    expect(appointmentErrors(withReadyBy(THURSDAY, true))).toEqual({})
    expect(appointmentErrors(withReadyBy({ ...THURSDAY, time: '17:15', endTime: '18:00' }, true))).toEqual({})
  })

  it('MFK on the day of the appointment', () => {
    expect(withMfk(THURSDAY, true).mfkDate).toBe('2026-10-15')
  })
})

describe('withDate', () => {
  it('derived dates move along with the appointment', () => {
    let form = withMfk(withReadyBy(withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS), true), true)

    form = withDate(form, '2026-10-20', '09:00', NO_HOLIDAYS)

    expect(form).toMatchObject({ date: '2026-10-20', time: '09:00', arrivesEarlierDate: '2026-10-20', arrivesEarlierTime: '07:00', readyByDate: '2026-10-20', mfkDate: '2026-10-20' })
  })

  it('"kommt früher" follows a new time too: moved to opening time it becomes the evening before, and back', () => {
    const preset = withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS)

    const early = withDate(preset, '2026-10-15', '07:00', NO_HOLIDAYS)
    expect(early).toMatchObject({ arrivesEarlierDate: '2026-10-14', arrivesEarlierTime: '17:00' })
    expect(withDate(early, '2026-10-15', '10:00', NO_HOLIDAYS)).toMatchObject({ arrivesEarlierDate: '2026-10-15', arrivesEarlierTime: '07:00' })
  })

  it('a time typed by hand for "kommt früher" stays when the appointment moves', () => {
    const form = { ...withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS), arrivesEarlierTime: '07:30' }

    expect(withDate(form, '2026-10-20', '09:00', NO_HOLIDAYS)).toMatchObject({ arrivesEarlierDate: '2026-10-15', arrivesEarlierTime: '07:30' })
  })

  it('the end moves along with the same duration – also over midnight', () => {
    const twoHours = { ...THURSDAY, endTime: '10:00' }

    expect(withDate(twoHours, '2026-10-20', '13:30', NO_HOLIDAYS)).toMatchObject({ endDate: '2026-10-20', endTime: '15:30' })
    expect(withDate(twoHours, '2026-10-20', '23:00', NO_HOLIDAYS)).toMatchObject({ endDate: '2026-10-21', endTime: '01:00' })
  })

  it('clearing the time while typing keeps a multi-day end – it does not shrink to one hour', () => {
    const untilThursday = { ...THURSDAY, date: '2026-10-13', endDate: '2026-10-15', endTime: '17:00' }

    const cleared = withDate(untilThursday, '2026-10-13', '', NO_HOLIDAYS)
    expect(cleared).toMatchObject({ time: '', endDate: '2026-10-15', endTime: '17:00' })
    expect(withDate(cleared, '2026-10-13', '09:00', NO_HOLIDAYS)).toMatchObject({ time: '09:00', endDate: '2026-10-15', endTime: '17:00' })
  })

  it('the first date gives the default hour, an invalid end is replaced by it', () => {
    expect(withDate(EMPTY_APPOINTMENT, '2026-10-15', '08:00', NO_HOLIDAYS)).toMatchObject({ endDate: '2026-10-15', endTime: '09:00' })
    expect(withDate({ ...THURSDAY, endTime: '07:00' }, '2026-10-15', '10:00', NO_HOLIDAYS).endTime).toBe('11:00')
  })

  it('dates set by hand stay', () => {
    const form = { ...withArrivesEarlier(THURSDAY, true, NO_HOLIDAYS), arrivesEarlierDate: '2026-10-12' }

    expect(withDate(form, '2026-10-20', '09:00', NO_HOLIDAYS).arrivesEarlierDate).toBe('2026-10-12')
  })
})

describe('appointmentErrors', () => {
  it('asks who accepts the order – never preset', () => {
    expect(EMPTY_APPOINTMENT.acceptedById).toBe('')
    expect(appointmentErrors({ ...THURSDAY, acceptedById: '' }).acceptedById).toBeDefined()
  })

  it('needs a date', () => {
    expect(appointmentErrors(EMPTY_APPOINTMENT).date).toBeDefined()
    expect(appointmentErrors(THURSDAY)).toEqual({})
  })

  it('arrives earlier before, ready by after the appointment', () => {
    const form = { ...THURSDAY, arrivesEarlier: true, arrivesEarlierDate: '2026-10-15', arrivesEarlierTime: '09:00',
      readyBy: true, readyByDate: '2026-10-15', readyByTime: '07:00' }

    expect(appointmentErrors(form)).toMatchObject({ arrivesEarlierDate: 'muss vor dem Termin liegen', readyByDate: 'muss nach dem Termin liegen' })
  })

  it('end after the start', () => {
    expect(appointmentErrors({ ...THURSDAY, endTime: '08:00' }).endTime).toBe('muss nach dem Beginn liegen')
    expect(appointmentErrors({ ...THURSDAY, endDate: '' }).endTime).toBe('Ende angeben')
    // a car waiting for parts stays until the next day
    expect(appointmentErrors({ ...THURSDAY, endDate: '2026-10-16', endTime: '07:00' })).toEqual({})
  })

  it('parts need a description', () => {
    expect(appointmentErrors({ ...THURSDAY, parts: true }).partsDescription).toBeDefined()
  })

  it('"Service" ticked needs at least one item – otherwise it would be saved as no service', () => {
    expect(appointmentErrors(withService(THURSDAY, true)).serviceItemIds).toBeDefined()
    expect(appointmentErrors({ ...withService(THURSDAY, true), serviceItemIds: ['oil'] })).toEqual({})
    // not ticked: nothing to complain about
    expect(appointmentErrors(THURSDAY).serviceItemIds).toBeUndefined()
  })
})

describe('withService', () => {
  it('unticking clears the chosen items, so nothing is saved unseen', () => {
    const chosen = { ...withService(THURSDAY, true), serviceItemIds: ['oil', 'filter'] }

    expect(withService(chosen, false)).toMatchObject({ service: false, serviceItemIds: [] })
    expect(toTaskRequest({ customer: { id: 'c1' } as Customer, vehicle: { kind: 'open' } }, withService(chosen, false)).serviceItemIds).toEqual([])
  })

  it('ticking again starts empty and keeps the rest of the form', () => {
    expect(withService(THURSDAY, true)).toEqual({ ...THURSDAY, service: true })
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
      endAt: '2026-10-15T09:00',
      timeOpen: false,
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
      mfkMinutes: 60,
      mfkDriverId: undefined,
      mfkStationId: undefined,
      serviceItemIds: [],
      parts: undefined,
      workDescription: undefined,
      notes: undefined,
      acceptedById: 'r',
      version: undefined,
    })
  })

  it('vehicle still open → no vehicle', () => {
    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, THURSDAY).vehicleId).toBeUndefined()
  })

  it('MFK ticked: the standard station with its duration – a station chosen before stays', () => {
    const standard = { id: 's1', minutes: 90 }

    expect(withMfk(THURSDAY, true, standard)).toMatchObject({ mfk: true, mfkStationId: 's1', mfkMinutes: '90' })
    const chosen = withMfkStation(withMfk(THURSDAY, true, standard), { id: 's2', minutes: 120 })
    expect(chosen).toMatchObject({ mfkStationId: 's2', mfkMinutes: '120' })
    expect(withMfk(withMfk(chosen, false), true, standard)).toMatchObject({ mfkStationId: 's2', mfkMinutes: '120' })
    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, chosen).mfkStationId).toBe('s2')
    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, { ...chosen, mfk: false }).mfkStationId).toBeUndefined()
  })

  it('the MFK trip (FB-10): duration and driver – without MFK nothing of it is sent', () => {
    const trip: AppointmentForm = { ...THURSDAY, mfk: true, mfkDate: '2026-10-16', mfkTime: '10:00', mfkMinutes: '90', mfkDriverId: 'e1' }

    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, trip)).toMatchObject({ mfkMinutes: 90, mfkDriverId: 'e1' })
    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, { ...trip, mfk: false })).toMatchObject({
      mfkMinutes: undefined,
      mfkDriverId: undefined,
    })
  })

  it('insurance case (FB-06): insurance and claim number – unticked, nothing of it is sent', () => {
    const insured: AppointmentForm = { ...THURSDAY, insuranceCase: true, insuranceId: 'i1', claimNumber: ' S-42 ' }

    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, insured)).toMatchObject({ insuranceId: 'i1', claimNumber: 'S-42' })
    expect(toTaskRequest({ customer, vehicle: { kind: 'open' } }, { ...insured, insuranceCase: false })).toMatchObject({
      insuranceId: undefined,
      claimNumber: undefined,
    })
    // the claim number may follow later, the insurance not
    expect(appointmentErrors({ ...insured, claimNumber: '' })).toEqual({})
    expect(appointmentErrors({ ...insured, insuranceId: '' }).insuranceId).toBeDefined()
  })
})

describe('mfkBeforeEnd', () => {
  const planned: AppointmentForm = { ...THURSDAY, mfk: true, mfkDate: '2026-10-15', mfkTime: '10:00', endDate: '2026-10-15', endTime: '11:00' }

  it('says so when the MFK is before the end of the workshop appointment', () => {
    expect(mfkBeforeEnd(planned)).toContain('(11:00)')
    // ends on another day: with the date
    expect(mfkBeforeEnd({ ...planned, mfkDate: '2026-10-16', endDate: '2026-10-16' })).toContain('(11:00)')
    expect(mfkBeforeEnd({ ...planned, endDate: '2026-10-16' })).toContain('(16.10.2026 11:00)')
  })

  it('nothing when it is after, open or there is no appointment', () => {
    expect(mfkBeforeEnd({ ...planned, mfkTime: '11:00' })).toBeNull()
    expect(mfkBeforeEnd({ ...planned, mfkTime: '' })).toBeNull()
    expect(mfkBeforeEnd({ ...planned, noAppointment: true })).toBeNull()
    expect(mfkBeforeEnd({ ...planned, mfk: false })).toBeNull()
  })
})

describe('formFromTask', () => {
  const task = {
    customer: { id: 'c1' },
    vehicle: null,
    date: '2026-10-15',
    time: '08:00:00',
    endAt: '2026-10-16T12:00:00',
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
      endAt: '2026-10-16T12:00',
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

  it('the MFK trip comes back – an old task without a duration gets the hour', () => {
    expect(formFromTask(task)).toMatchObject({ mfkMinutes: '60', mfkDriverId: '' })
    expect(formFromTask({ ...task, mfkMinutes: 120, mfkDriverId: 'e1' } as Task)).toMatchObject({ mfkMinutes: '120', mfkDriverId: 'e1' })
  })

  it('an insurance case comes back ticked, with its claim number', () => {
    expect(formFromTask(task)).toMatchObject({ insuranceCase: false, insuranceId: '', claimNumber: '' })
    expect(formFromTask({ ...task, insuranceId: 'i1', claimNumber: 'S-42' } as Task)).toMatchObject({
      insuranceCase: true,
      insuranceId: 'i1',
      claimNumber: 'S-42',
    })
  })

  it('a task without vehicle stays "vehicle open"', () => {
    expect(customerStepFromTask(task).vehicle).toEqual({ kind: 'open' })
  })

  it('"Service" is ticked exactly when the task has service items', () => {
    expect(formFromTask(task).service).toBe(true)
    expect(formFromTask({ ...task, serviceItemIds: [] } as Task).service).toBe(false)
  })

  it('a saved "ready by" keeps its own time – the new preset only applies to new ticks', () => {
    expect(formFromTask({ ...task, readyBy: '2026-10-15T17:00:00' } as Task)).toMatchObject({ readyBy: true, readyByTime: '17:00' })
    expect(formFromTask(task).readyByTime).toBe('17:30')
  })
})

describe('slots from a time grid', () => {
  const slot = { liftId: 'l2', date: '2026-10-16', time: '13:30', endAt: '2026-10-16T15:00' }

  it('takes over lift, start and end – derived dates move along', () => {
    const form = withSlot({ ...THURSDAY, mfk: true, mfkDate: '2026-10-15' }, slot, NO_HOLIDAYS)

    expect(form).toMatchObject({ liftId: 'l2', date: '2026-10-16', time: '13:30', endDate: '2026-10-16', endTime: '15:00', mfkDate: '2026-10-16' })
    expect(withSlot(THURSDAY, { ...slot, liftId: null }, NO_HOLIDAYS).liftId).toBe('')
  })

  it('travels through the address of the wizard', () => {
    const url = newTaskUrl(slot)

    expect(slotFromUrl(new URL(url, 'http://x').searchParams)).toEqual(slot)
    expect(slotFromUrl(new URLSearchParams('date=2026-10-16&time=8&end=x'))).toBeNull()
    expect(slotFromUrl(new URLSearchParams('date=2026-10-16&time=08:00&end=2026-10-16T09:00'))?.liftId).toBeNull()
  })
})

describe('an order without appointment', () => {
  const customer = { id: 'c1' } as Customer
  // everything about a day is filled in, then "Noch kein Termin" is ticked
  const waiting: AppointmentForm = {
    ...THURSDAY,
    noAppointment: true,
    liftId: 'l1',
    mechanicId: 'm1',
    timeOpen: true,
    waitingCustomer: true,
    readyBy: true,
    readyByDate: '2026-10-15',
    workDescription: 'Kupplung ersetzen',
  }

  it('asks for no day and time – but still for who accepted it', () => {
    expect(appointmentErrors({ ...EMPTY_APPOINTMENT, noAppointment: true, acceptedById: 'r' })).toEqual({})
    expect(appointmentErrors({ ...EMPTY_APPOINTMENT, noAppointment: true }).acceptedById).toBeDefined()
  })

  it('sends nothing that hangs on a day; the work and the mechanic stay', () => {
    const request = toTaskRequest({ customer, vehicle: { kind: 'open' } }, waiting)

    expect(request).toMatchObject({ customerId: 'c1', mechanicId: 'm1', workDescription: 'Kupplung ersetzen', timeOpen: false, waitingCustomer: false })
    expect(request.date).toBeUndefined()
    expect(request.time).toBeUndefined()
    expect(request.endAt).toBeUndefined()
    expect(request.liftId).toBeUndefined()
    expect(request.readyBy).toBeUndefined()
  })

  it('a place dragged in the grid plans it', () => {
    const slot = { liftId: 'l2', date: '2026-10-16', time: '13:30', endAt: '2026-10-16T15:00' }

    expect(withSlot(waiting, slot, NO_HOLIDAYS)).toMatchObject({ noAppointment: false, date: '2026-10-16', liftId: 'l2' })
  })

  it('opens for editing with the usual defaults, ready to be planned', () => {
    const saved = { date: null, time: null, endAt: null, arrivesEarlier: null, readyBy: null, mfkAppointment: null, serviceItemIds: [], parts: null } as unknown as AnyTask

    expect(formFromTask(saved)).toMatchObject({ noAppointment: true, date: '', time: '08:00', endDate: '', endTime: '09:00' })
  })
})

describe('appointmentMinutes', () => {
  it('the duration as entered', () => {
    expect(appointmentMinutes(THURSDAY)).toBe(60)
  })

  it('a cleared time with an end does not throw – the page would break and lose the wizard', () => {
    expect(appointmentMinutes({ ...THURSDAY, time: '' })).toBeNull()
    expect(appointmentMinutes({ ...THURSDAY, endTime: '' })).toBeNull()
  })
})
