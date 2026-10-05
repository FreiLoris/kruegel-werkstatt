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
  if (!period) return 'Abholung und Rückgabe angeben'
  if (period.returnAt <= period.pickupAt) return 'Die Rückgabe muss nach der Abholung liegen'
  if (!choice.courtesyCarId) return 'Einen freien Ersatzwagen wählen'
  return null
}
