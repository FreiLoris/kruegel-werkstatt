import { previousWorkingDay } from '../../../lib/calendar'
import { addDays, addMinutes, minutesBetween } from '../../../lib/format'
import type { PartsStatus, Task, TaskRequest, TireChangeKind } from '../taskApi'
import type { CustomerStepValue } from './wizardState'

/**
 * Wizard step 2 as form state: everything as text/ticks while typing, '' = empty.
 * Pure functions on it below – tested without rendering anything.
 */
export interface AppointmentForm {
  date: string
  time: string
  /** Until when the lift is taken – usually the same day, a car waiting for parts may stay longer */
  endDate: string
  endTime: string
  arrivesEarlier: boolean
  arrivesEarlierDate: string
  arrivesEarlierTime: string
  readyBy: boolean
  readyByDate: string
  readyByTime: string
  waitingCustomer: boolean
  /** '' = still open */
  mechanicId: string
  /** '' = still open */
  liftId: string
  tireChange: boolean
  tireChangeKind: TireChangeKind | ''
  mfk: boolean
  mfkDate: string
  mfkTime: string
  serviceItemIds: string[]
  parts: boolean
  partsDescription: string
  partsStatus: PartsStatus
  partsSupplier: string
  partsOrderedOn: string
  workDescription: string
  notes: string
  /** SwissGarage order number – often only known later */
  taskNumber: string
}

/** Drop-off "the evening before" and "ready by" end of the working day */
export const EVENING = '17:00'

/** Duration of a new task, like the backend default – short enough that it gets noticed and adjusted */
export const DEFAULT_DURATION_MINUTES = 60

/** No date on purpose: it must be chosen (or clicked in the overview), never taken over by accident. */
export const EMPTY_APPOINTMENT: AppointmentForm = {
  date: '',
  time: '08:00',
  endDate: '',
  endTime: '09:00',
  arrivesEarlier: false,
  arrivesEarlierDate: '',
  arrivesEarlierTime: EVENING,
  readyBy: false,
  readyByDate: '',
  readyByTime: EVENING,
  waitingCustomer: false,
  mechanicId: '',
  liftId: '',
  tireChange: false,
  tireChangeKind: '',
  mfk: false,
  mfkDate: '',
  mfkTime: '',
  serviceItemIds: [],
  parts: false,
  partsDescription: '',
  partsStatus: 'TO_ORDER',
  partsSupplier: '',
  partsOrderedOn: '',
  workDescription: '',
  notes: '',
  taskNumber: '',
}

/** "Kommt früher" ticked: the evening of the previous working day (Monday → Friday). */
export function withArrivesEarlier(form: AppointmentForm, on: boolean, holidays: ReadonlySet<string>): AppointmentForm {
  if (!on) return { ...form, arrivesEarlier: false }
  return {
    ...form,
    arrivesEarlier: true,
    arrivesEarlierDate: form.arrivesEarlierDate || (form.date ? previousWorkingDay(form.date, holidays) : ''),
  }
}

/** "Fertig bis" ticked: the same evening – or the next day for a late appointment. */
export function withReadyBy(form: AppointmentForm, on: boolean): AppointmentForm {
  if (!on) return { ...form, readyBy: false }
  return { ...form, readyBy: true, readyByDate: form.readyByDate || defaultReadyByDate(form.date, form.time) }
}

function defaultReadyByDate(date: string, time: string): string {
  if (!date) return ''
  return time && time >= EVENING ? addDays(date, 1) : date
}

/** Minutes from start to end, or the default while one of them is incomplete or the end is not after the start. */
export function durationMinutes(form: AppointmentForm): number {
  if (!form.date || !form.time || !form.endDate || !form.endTime) return DEFAULT_DURATION_MINUTES
  const minutes = minutesBetween(`${form.date}T${form.time}`, `${form.endDate}T${form.endTime}`)
  return minutes > 0 ? minutes : DEFAULT_DURATION_MINUTES
}

/** The end for a start, keeping the duration – without a date only the time can be shown. */
function endAfter(date: string, time: string, minutes: number): Pick<AppointmentForm, 'endDate' | 'endTime'> {
  if (!time) return { endDate: date, endTime: '' }
  const [endDate, endTime] = addMinutes(`${date || '2000-01-01'}T${time}`, minutes).split('T')
  return { endDate: date ? endDate : '', endTime }
}

/**
 * New appointment date or time (typed or clicked in the overview). The end moves along with the
 * same duration – like moving an appointment in Outlook. Dates that were derived from the old date
 * (evening before, ready by, MFK on the same day) move along; dates typed by hand stay.
 */
export function withDate(form: AppointmentForm, date: string, time: string, holidays: ReadonlySet<string>): AppointmentForm {
  const old = form.date
  const derivedEarlier = old ? previousWorkingDay(old, holidays) : ''
  const derivedReady = defaultReadyByDate(old, form.time)
  return {
    ...form,
    date,
    time,
    ...endAfter(date, time, durationMinutes(form)),
    arrivesEarlierDate:
      form.arrivesEarlier && date && (!form.arrivesEarlierDate || form.arrivesEarlierDate === derivedEarlier)
        ? previousWorkingDay(date, holidays)
        : form.arrivesEarlierDate,
    readyByDate:
      form.readyBy && (!form.readyByDate || form.readyByDate === derivedReady) ? defaultReadyByDate(date, time) : form.readyByDate,
    mfkDate: form.mfk && (!form.mfkDate || form.mfkDate === old) ? date : form.mfkDate,
  }
}

/** "MFK" ticked: the inspection is usually on the day of the appointment. */
export function withMfk(form: AppointmentForm, on: boolean): AppointmentForm {
  if (!on) return { ...form, mfk: false }
  return { ...form, mfk: true, mfkDate: form.mfkDate || form.date }
}

export type AppointmentErrors = Partial<Record<keyof AppointmentForm, string>>

/**
 * The same rules as the backend, shown before saving. Field names as in the form.
 * German, they appear at the field.
 */
export function appointmentErrors(form: AppointmentForm): AppointmentErrors {
  const errors: AppointmentErrors = {}
  if (!form.date) errors.date = 'Datum wählen – oder rechts in der Übersicht klicken'
  if (!form.time) errors.time = 'Uhrzeit wählen'
  const start = form.date && form.time ? `${form.date}T${form.time}` : null

  if (!form.endDate || !form.endTime) {
    errors.endTime = 'Ende angeben'
  } else if (start && `${form.endDate}T${form.endTime}` <= start) {
    errors.endTime = 'muss nach dem Beginn liegen'
  }
  if (form.arrivesEarlier) {
    if (!form.arrivesEarlierDate || !form.arrivesEarlierTime) {
      errors.arrivesEarlierDate = 'Datum und Uhrzeit angeben'
    } else if (start && `${form.arrivesEarlierDate}T${form.arrivesEarlierTime}` >= start) {
      errors.arrivesEarlierDate = 'muss vor dem Termin liegen'
    }
  }
  if (form.readyBy) {
    if (!form.readyByDate || !form.readyByTime) {
      errors.readyByDate = 'Datum und Uhrzeit angeben'
    } else if (start && `${form.readyByDate}T${form.readyByTime}` <= start) {
      errors.readyByDate = 'muss nach dem Termin liegen'
    }
  }
  if (form.mfk && form.mfkTime && !form.mfkDate) errors.mfkDate = 'Datum zur Uhrzeit angeben'
  if (form.parts && !form.partsDescription.trim()) errors.partsDescription = 'Was muss bestellt werden?'
  return errors
}

/** Form → JSON for POST/PUT /api/tasks. Unticked options are left out; `version` only when editing. */
export function toTaskRequest(step1: CustomerStepValue, form: AppointmentForm, version?: number): TaskRequest {
  if (!step1.customer) throw new Error('Step 1 not complete')
  const text = (value: string) => value.trim() || undefined
  return {
    customerId: step1.customer.id,
    vehicleId: step1.vehicle?.kind === 'vehicle' ? step1.vehicle.vehicle.id : undefined,
    date: form.date,
    time: form.time,
    endAt: `${form.endDate}T${form.endTime}`,
    arrivesEarlier: form.arrivesEarlier ? `${form.arrivesEarlierDate}T${form.arrivesEarlierTime}` : undefined,
    readyBy: form.readyBy ? `${form.readyByDate}T${form.readyByTime}` : undefined,
    waitingCustomer: form.waitingCustomer,
    mechanicId: form.mechanicId || undefined,
    liftId: form.liftId || undefined,
    tireChange: form.tireChange,
    tireChangeKind: form.tireChange && form.tireChangeKind ? form.tireChangeKind : undefined,
    mfk: form.mfk,
    mfkAppointment: form.mfk && form.mfkDate && form.mfkTime ? `${form.mfkDate}T${form.mfkTime}` : undefined,
    serviceItemIds: form.serviceItemIds,
    parts: form.parts
      ? {
          description: form.partsDescription.trim(),
          status: form.partsStatus,
          supplier: text(form.partsSupplier),
          orderedOn: form.partsOrderedOn || undefined,
        }
      : undefined,
    workDescription: text(form.workDescription),
    notes: text(form.notes),
    taskNumber: text(form.taskNumber),
    version,
  }
}

/** "2026-10-14T17:00:00" → ["2026-10-14", "17:00"] – the form works with minutes */
function split(dateTime: string | null): [string, string] {
  if (!dateTime) return ['', '']
  const [date, time] = dateTime.split('T')
  return [date, time.slice(0, 5)]
}

/** A saved task back into the form – for editing. The opposite of {@link toTaskRequest}. */
export function formFromTask(task: Task): AppointmentForm {
  const [endDate, endTime] = split(task.endAt)
  const [arrivesEarlierDate, arrivesEarlierTime] = split(task.arrivesEarlier)
  const [readyByDate, readyByTime] = split(task.readyBy)
  const [mfkDate, mfkTime] = split(task.mfkAppointment)
  return {
    date: task.date,
    time: task.time.slice(0, 5),
    endDate,
    endTime,
    arrivesEarlier: task.arrivesEarlier !== null,
    arrivesEarlierDate,
    arrivesEarlierTime: arrivesEarlierTime || EVENING,
    readyBy: task.readyBy !== null,
    readyByDate,
    readyByTime: readyByTime || EVENING,
    waitingCustomer: task.waitingCustomer,
    mechanicId: task.mechanicId ?? '',
    liftId: task.liftId ?? '',
    tireChange: task.tireChange,
    tireChangeKind: task.tireChangeKind ?? '',
    mfk: task.mfk,
    mfkDate,
    mfkTime,
    serviceItemIds: task.serviceItemIds,
    parts: task.parts !== null,
    partsDescription: task.parts?.description ?? '',
    partsStatus: task.parts?.status ?? 'TO_ORDER',
    partsSupplier: task.parts?.supplier ?? '',
    partsOrderedOn: task.parts?.orderedOn ?? '',
    workDescription: task.workDescription ?? '',
    notes: task.notes ?? '',
    taskNumber: task.taskNumber ?? '',
  }
}

/** Customer and vehicle of a saved task as step 1 value. */
export function customerStepFromTask(task: Task): CustomerStepValue {
  return { customer: task.customer, vehicle: task.vehicle ? { kind: 'vehicle', vehicle: task.vehicle } : { kind: 'open' } }
}
