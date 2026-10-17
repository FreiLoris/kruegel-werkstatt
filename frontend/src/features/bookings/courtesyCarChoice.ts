import { addDays, minutesBetween } from '../../lib/format'
import type { AppointmentForm } from '../tasks/wizard/appointmentForm'

/**
 * Wizard: the courtesy car for a new task as form state. Pickup and return follow the appointment
 * ("kommt früher" or the start / "fertig bis" or the end) until they are changed by hand – like
 * the derived dates of the appointment form. Date-times as "2026-10-15T08:00".
 */
export interface CourtesyCarChoice {
  wanted: boolean
  /** '' = none chosen yet */
  courtesyCarId: string
  /** undefined = follows the appointment */
  pickupAt?: string
  returnAt?: string
  notes: string
}

export const NO_COURTESY_CAR: CourtesyCarChoice = { wanted: false, courtesyCarId: '', notes: '' }

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/**
 * Pickup and return both complete ("2026-10-15T08:00") and the return after the pickup.
 * Half-filled values such as "2026-10-20T" or "T" must not count – compared as text "T" is after "2…".
 */
export function isValidPeriod(pickupAt: string | null | undefined, returnAt: string | null | undefined): boolean {
  return !!pickupAt && !!returnAt && DATE_TIME.test(pickupAt) && DATE_TIME.test(returnAt) && returnAt > pickupAt
}

/** Pickup and return the appointment suggests – null while the appointment is not complete. */
export function suggestedPeriod(form: AppointmentForm): { pickupAt: string; returnAt: string } | null {
  if (!form.date || !form.time || !form.endDate || !form.endTime) return null
  return {
    pickupAt:
      form.arrivesEarlier && form.arrivesEarlierDate && form.arrivesEarlierTime
        ? `${form.arrivesEarlierDate}T${form.arrivesEarlierTime}`
        : `${form.date}T${form.time}`,
    returnAt: form.readyBy && form.readyByDate && form.readyByTime ? `${form.readyByDate}T${form.readyByTime}` : `${form.endDate}T${form.endTime}`,
  }
}

/** The period that counts: typed by hand, else suggested by the appointment. */
export function periodOf(choice: CourtesyCarChoice, form: AppointmentForm): { pickupAt: string; returnAt: string } | null {
  const suggested = suggestedPeriod(form)
  const pickupAt = choice.pickupAt ?? suggested?.pickupAt
  const returnAt = choice.returnAt ?? suggested?.returnAt
  return pickupAt && returnAt ? { pickupAt, returnAt } : null
}

/** What is still missing before saving – German, shown at the section. */
export function choiceError(choice: CourtesyCarChoice, form: AppointmentForm): string | null {
  if (!choice.wanted) return null
  const period = periodOf(choice, form)
  if (!period || !DATE_TIME.test(period.pickupAt) || !DATE_TIME.test(period.returnAt)) return 'Abholung und Rückgabe angeben'
  if (period.returnAt <= period.pickupAt) return 'Die Rückgabe muss nach der Abholung liegen'
  if (!choice.courtesyCarId) return 'Einen freien Ersatzwagen wählen'
  return null
}

/**
 * "2026-10-15T08:00" → date and time. Split at the "T", not by position: while a date is being typed
 * the browser reports it empty ("T08:00") – the time must survive that (UX G-19).
 */
export function splitDateTime(dateTime: string | null): [string, string] {
  if (!dateTime) return ['', '']
  const [date, time = ''] = dateTime.split('T')
  return [date, time.slice(0, 5)]
}

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** A new pickup day moves the return day along by as many days – the booking keeps its length. */
export function returnDateAfterMove(oldPickup: string, newPickup: string, returnDate: string): string {
  if (!DAY_ONLY.test(oldPickup) || !DAY_ONLY.test(newPickup) || !DAY_ONLY.test(returnDate)) return returnDate
  return addDays(returnDate, Math.round(minutesBetween(`${oldPickup}T00:00`, `${newPickup}T00:00`) / (24 * 60)))
}
