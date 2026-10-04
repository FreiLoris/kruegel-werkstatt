import { previousWorkingDay } from '../../../lib/calendar'
import { addDays } from '../../../lib/format'
import type { PartsStatus, TaskRequest, TireChangeKind } from '../taskApi'
import type { CustomerStepValue } from './wizardState'

/**
 * Wizard step 2 as form state: everything as text/ticks while typing, '' = empty.
 * Pure functions on it below – tested without rendering anything.
 */
export interface AppointmentForm {
  date: string
  time: string
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
}

/** Drop-off "the evening before" and "ready by" end of the working day */
export const EVENING = '17:00'

/** No date on purpose: it must be chosen (or clicked in the overview), never taken over by accident. */
export const EMPTY_APPOINTMENT: AppointmentForm = {
  date: '',
  time: '08:00',
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

/**
 * New appointment date (typed or clicked in the overview). Dates that were derived from the old
 * date (evening before, ready by, MFK on the same day) move along; dates typed by hand stay.
 */
export function withDate(form: AppointmentForm, date: string, time: string, holidays: ReadonlySet<string>): AppointmentForm {
  const old = form.date
  const derivedEarlier = old ? previousWorkingDay(old, holidays) : ''
  const derivedReady = defaultReadyByDate(old, form.time)
  return {
    ...form,
    date,
    time,
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

/** Form → JSON for POST /api/tasks. Unticked options are left out completely. */
export function toTaskRequest(step1: CustomerStepValue, form: AppointmentForm): TaskRequest {
  if (!step1.customer) throw new Error('Step 1 not complete')
  const text = (value: string) => value.trim() || undefined
  return {
    customerId: step1.customer.id,
    vehicleId: step1.vehicle?.kind === 'vehicle' ? step1.vehicle.vehicle.id : undefined,
    date: form.date,
    time: form.time,
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
  }
}
