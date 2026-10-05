import { describe, expect, it } from 'vitest'
import { EMPTY_APPOINTMENT, type AppointmentForm } from '../tasks/wizard/appointmentForm'
import { choiceError, NO_COURTESY_CAR, periodOf, suggestedPeriod } from './courtesyCarChoice'

const FORM: AppointmentForm = { ...EMPTY_APPOINTMENT, date: '2026-10-15', time: '08:00', endDate: '2026-10-15', endTime: '11:00' }

describe('suggestedPeriod', () => {
  it('from start to end of the appointment', () => {
    expect(suggestedPeriod(FORM)).toEqual({ pickupAt: '2026-10-15T08:00', returnAt: '2026-10-15T11:00' })
    expect(suggestedPeriod(EMPTY_APPOINTMENT)).toBeNull()
  })

  it('from "kommt früher" to "fertig bis" when given', () => {
    const form = { ...FORM, arrivesEarlier: true, arrivesEarlierDate: '2026-10-14', arrivesEarlierTime: '17:00',
      readyBy: true, readyByDate: '2026-10-15', readyByTime: '17:00' }

    expect(suggestedPeriod(form)).toEqual({ pickupAt: '2026-10-14T17:00', returnAt: '2026-10-15T17:00' })
  })
})

describe('periodOf and choiceError', () => {
  const wanted = { ...NO_COURTESY_CAR, wanted: true }

  it('a time typed by hand wins over the suggestion', () => {
    expect(periodOf({ ...wanted, returnAt: '2026-10-16T09:00' }, FORM)).toEqual({ pickupAt: '2026-10-15T08:00', returnAt: '2026-10-16T09:00' })
  })

  it('says what is missing', () => {
    expect(choiceError(NO_COURTESY_CAR, FORM)).toBeNull()
    expect(choiceError(wanted, EMPTY_APPOINTMENT)).toBe('Abholung und Rückgabe angeben')
    expect(choiceError({ ...wanted, returnAt: '2026-10-15T07:00' }, FORM)).toBe('Die Rückgabe muss nach der Abholung liegen')
    expect(choiceError(wanted, FORM)).toBe('Einen freien Ersatzwagen wählen')
    expect(choiceError({ ...wanted, courtesyCarId: 'c1' }, FORM)).toBeNull()
  })
})
