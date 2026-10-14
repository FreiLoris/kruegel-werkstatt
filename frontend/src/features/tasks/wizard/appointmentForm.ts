import { previousWorkingDay } from '../../../lib/calendar'
import { addDays, addMinutes, minutesBetween } from '../../../lib/format'
import type { Schedule } from '../day/timeGrid'
import type { AnyTask, PartsStatus, TaskRequest, TireChangeKind } from '../taskApi'
import type { CustomerStepValue } from './wizardState'

/**
 * Wizard step 2 as form state: everything as text/ticks while typing, '' = empty.
 * Pure functions on it below – tested without rendering anything.
 */
export interface AppointmentForm {
  /**
   * "Noch kein Termin" (12d-3): the order is taken, when the car comes is open. Day, time, lift
   * and everything that hangs on a day are then not asked for and not sent – what was typed
   * before stays in the form, so unticking brings it back.
   */
  noAppointment: boolean
  date: string
  time: string
  /** Until when the lift is taken – usually the same day, a car waiting for parts may stay longer */
  endDate: string
  endTime: string
  /** "Zeit offen": time and end only reserve the lift, people see no clock time */
  timeOpen: boolean
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
  /** "Service" ticked – only then the service items are offered; unticking clears them ({@link withService}) */
  service: boolean
  serviceItemIds: string[]
  parts: boolean
  partsDescription: string
  partsStatus: PartsStatus
  partsSupplier: string
  partsOrderedOn: string
  workDescription: string
  notes: string
  /** "Versicherungsfall" (FB-06): the insurance must then be chosen, the claim number may follow later */
  insuranceCase: boolean
  insuranceId: string
  claimNumber: string
  /** Who takes the order from the customer ("Annehmer") – '' = not chosen yet; required, never preset */
  acceptedById: string
}

/** Drop-off "the evening before" */
export const EVENING = '17:00'

/** Drop-off "early in the morning": when the workshop opens (the day view starts there too) */
export const MORNING = '07:00'

/** "Muss fertig sein bis": when the workshop closes (feedback from the workshop, 10/2026 – was 17:00) */
export const READY_BY_TIME = '17:30'

/** Duration of a new task, like the backend default – short enough that it gets noticed and adjusted */
export const DEFAULT_DURATION_MINUTES = 60

/** No date on purpose: it must be chosen (or clicked in the overview), never taken over by accident. */
export const EMPTY_APPOINTMENT: AppointmentForm = {
  noAppointment: false,
  date: '',
  time: '08:00',
  endDate: '',
  endTime: '09:00',
  timeOpen: false,
  arrivesEarlier: false,
  arrivesEarlierDate: '',
  arrivesEarlierTime: EVENING,
  readyBy: false,
  readyByDate: '',
  readyByTime: READY_BY_TIME,
  waitingCustomer: false,
  mechanicId: '',
  liftId: '',
  tireChange: false,
  tireChangeKind: '',
  mfk: false,
  mfkDate: '',
  mfkTime: '',
  service: false,
  serviceItemIds: [],
  parts: false,
  partsDescription: '',
  partsStatus: 'TO_ORDER',
  partsSupplier: '',
  partsOrderedOn: '',
  workDescription: '',
  notes: '',
  insuranceCase: false,
  insuranceId: '',
  claimNumber: '',
  acceptedById: '',
}

/**
 * When a car that "comes earlier" usually comes: the day of the appointment, when the workshop
 * opens (feedback from the workshop, 10/2026 – was always the evening before). An appointment
 * right at opening time leaves no "earlier" on its day: then the evening of the previous working
 * day (Monday → Friday).
 */
function defaultArrivesEarlier(date: string, time: string, holidays: ReadonlySet<string>): { date: string; time: string } {
  return time > MORNING ? { date, time: MORNING } : { date: previousWorkingDay(date, holidays), time: EVENING }
}

/** "Kommt früher" ticked: preset {@link defaultArrivesEarlier} – a date typed before stays. */
export function withArrivesEarlier(form: AppointmentForm, on: boolean, holidays: ReadonlySet<string>): AppointmentForm {
  if (!on) return { ...form, arrivesEarlier: false }
  if (form.arrivesEarlierDate || !form.date) return { ...form, arrivesEarlier: true }
  const preset = defaultArrivesEarlier(form.date, form.time, holidays)
  return { ...form, arrivesEarlier: true, arrivesEarlierDate: preset.date, arrivesEarlierTime: preset.time }
}

/** "Fertig bis" ticked: the day of the appointment at closing time – or the next day for a late appointment. */
export function withReadyBy(form: AppointmentForm, on: boolean): AppointmentForm {
  if (!on) return { ...form, readyBy: false }
  return { ...form, readyBy: true, readyByDate: form.readyByDate || defaultReadyByDate(form.date, form.time) }
}

function defaultReadyByDate(date: string, time: string): string {
  if (!date) return ''
  // an appointment at or after closing time cannot be ready the same day
  return time && time >= READY_BY_TIME ? addDays(date, 1) : date
}

/** "Service" ticked or unticked. Unticking clears the chosen items – otherwise they would be saved unseen. */
export function withService(form: AppointmentForm, on: boolean): AppointmentForm {
  return on ? { ...form, service: true } : { ...form, service: false, serviceItemIds: [] }
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
 * ("kommt früher", ready by, MFK on the same day) move along; dates typed by hand stay.
 */
export function withDate(form: AppointmentForm, date: string, time: string, holidays: ReadonlySet<string>): AppointmentForm {
  const old = form.date
  // "kommt früher" still at its preset (or not set yet) → it gets the preset of the new appointment
  const oldEarlier = old ? defaultArrivesEarlier(old, form.time, holidays) : null
  const earlierUntouched =
    !form.arrivesEarlierDate || (oldEarlier !== null && form.arrivesEarlierDate === oldEarlier.date && form.arrivesEarlierTime === oldEarlier.time)
  const earlier = form.arrivesEarlier && date && earlierUntouched ? defaultArrivesEarlier(date, time, holidays) : null
  const derivedReady = defaultReadyByDate(old, form.time)
  return {
    ...form,
    date,
    time,
    ...endAfter(date, time, durationMinutes(form)),
    arrivesEarlierDate: earlier ? earlier.date : form.arrivesEarlierDate,
    arrivesEarlierTime: earlier ? earlier.time : form.arrivesEarlierTime,
    readyByDate:
      form.readyBy && (!form.readyByDate || form.readyByDate === derivedReady) ? defaultReadyByDate(date, time) : form.readyByDate,
    mfkDate: form.mfk && (!form.mfkDate || form.mfkDate === old) ? date : form.mfkDate,
  }
}

/**
 * Lift, start and end chosen in a time grid (day view or the wizard's overview) – taken over like
 * a new date, plus end and lift.
 */
export function withSlot(form: AppointmentForm, slot: Schedule, holidays: ReadonlySet<string>): AppointmentForm {
  const [endDate, endTime] = slot.endAt.split('T')
  // dragging a place in the grid IS planning – "Noch kein Termin" is off again
  return { ...withDate(form, slot.date, slot.time, holidays), noAppointment: false, endDate, endTime: endTime.slice(0, 5), liftId: slot.liftId ?? '' }
}

const SLOT_DATE = /^\d{4}-\d{2}-\d{2}$/
const SLOT_TIME = /^\d{2}:\d{2}$/
const SLOT_END = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/** The wizard prefilled with a slot dragged open in the day view */
export function newTaskUrl(slot: Schedule): string {
  const params = new URLSearchParams({ date: slot.date, time: slot.time, end: slot.endAt })
  if (slot.liftId) params.set('lift', slot.liftId)
  return `/tasks/new?${params}`
}

/** The slot from the wizard's address – only when complete and well-formed (a bookmark may be anything) */
export function slotFromUrl(params: URLSearchParams): Schedule | null {
  const date = params.get('date') ?? ''
  const time = params.get('time') ?? ''
  const endAt = params.get('end') ?? ''
  if (!SLOT_DATE.test(date) || !SLOT_TIME.test(time) || !SLOT_END.test(endAt)) return null
  return { date, time, endAt, liftId: params.get('lift') }
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
  // everyone uses every PC – so it is asked for every order instead of taken from the device
  if (!form.acceptedById) errors.acceptedById = 'Bitte wählen, wer den Auftrag annimmt'
  // without an appointment nothing about day and time is asked
  if (!form.noAppointment) {
    if (!form.date) errors.date = 'Datum wählen – oder rechts im Raster ziehen'
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
  }
  if (form.mfk && form.mfkTime && !form.mfkDate) errors.mfkDate = 'Datum zur Uhrzeit angeben'
  // "Service" ticked but nothing chosen would be saved as "no service" without anyone noticing
  if (form.service && form.serviceItemIds.length === 0) errors.serviceItemIds = 'Mindestens eine Leistung wählen – oder «Service» abwählen'
  if (form.parts && !form.partsDescription.trim()) errors.partsDescription = 'Was muss bestellt werden?'
  if (form.insuranceCase && !form.insuranceId) errors.insuranceId = 'Versicherung wählen – oder «Versicherungsfall» abwählen'
  return errors
}

/** Form → JSON for POST/PUT /api/tasks. Unticked options are left out; `version` only when editing. */
export function toTaskRequest(step1: CustomerStepValue, form: AppointmentForm, version?: number): TaskRequest {
  if (!step1.customer) throw new Error('Step 1 not complete')
  const text = (value: string) => value.trim() || undefined
  const planned = !form.noAppointment
  return {
    customerId: step1.customer.id,
    vehicleId: step1.vehicle?.kind === 'vehicle' ? step1.vehicle.vehicle.id : undefined,
    // without an appointment nothing that hangs on a day is sent (the server refuses it)
    date: planned ? form.date : undefined,
    time: planned ? form.time : undefined,
    endAt: planned ? `${form.endDate}T${form.endTime}` : undefined,
    timeOpen: planned && form.timeOpen,
    arrivesEarlier: planned && form.arrivesEarlier ? `${form.arrivesEarlierDate}T${form.arrivesEarlierTime}` : undefined,
    readyBy: planned && form.readyBy ? `${form.readyByDate}T${form.readyByTime}` : undefined,
    waitingCustomer: planned && form.waitingCustomer,
    mechanicId: form.mechanicId || undefined,
    liftId: planned ? form.liftId || undefined : undefined,
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
    // unticked: what was chosen before is not sent – the task is no insurance case any more
    insuranceId: form.insuranceCase ? form.insuranceId || undefined : undefined,
    claimNumber: form.insuranceCase ? text(form.claimNumber) : undefined,
    acceptedById: form.acceptedById || undefined,
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
export function formFromTask(task: AnyTask): AppointmentForm {
  const [endDate, endTime] = split(task.endAt)
  const [arrivesEarlierDate, arrivesEarlierTime] = split(task.arrivesEarlier)
  const [readyByDate, readyByTime] = split(task.readyBy)
  const [mfkDate, mfkTime] = split(task.mfkAppointment)
  return {
    // an order without appointment opens with the usual defaults – unticking then plans it
    noAppointment: task.date === null,
    date: task.date ?? '',
    time: task.time?.slice(0, 5) ?? EMPTY_APPOINTMENT.time,
    endDate,
    endTime: endTime || EMPTY_APPOINTMENT.endTime,
    timeOpen: task.timeOpen,
    arrivesEarlier: task.arrivesEarlier !== null,
    arrivesEarlierDate,
    arrivesEarlierTime: arrivesEarlierTime || EVENING,
    readyBy: task.readyBy !== null,
    readyByDate,
    readyByTime: readyByTime || READY_BY_TIME,
    waitingCustomer: task.waitingCustomer,
    mechanicId: task.mechanicId ?? '',
    liftId: task.liftId ?? '',
    tireChange: task.tireChange,
    tireChangeKind: task.tireChangeKind ?? '',
    mfk: task.mfk,
    mfkDate,
    mfkTime,
    service: task.serviceItemIds.length > 0,
    serviceItemIds: task.serviceItemIds,
    parts: task.parts !== null,
    partsDescription: task.parts?.description ?? '',
    partsStatus: task.parts?.status ?? 'TO_ORDER',
    partsSupplier: task.parts?.supplier ?? '',
    partsOrderedOn: task.parts?.orderedOn ?? '',
    workDescription: task.workDescription ?? '',
    notes: task.notes ?? '',
    insuranceCase: !!task.insuranceId,
    insuranceId: task.insuranceId ?? '',
    claimNumber: task.claimNumber ?? '',
    acceptedById: task.acceptedById ?? '',
  }
}

/** Customer and vehicle of a saved task as step 1 value. */
export function customerStepFromTask(task: AnyTask): CustomerStepValue {
  return { customer: task.customer, vehicle: task.vehicle ? { kind: 'vehicle', vehicle: task.vehicle } : { kind: 'open' } }
}
