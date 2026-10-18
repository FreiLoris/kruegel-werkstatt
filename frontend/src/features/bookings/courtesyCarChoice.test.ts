import { describe, expect, it } from 'vitest'
import { EMPTY_APPOINTMENT, type AppointmentForm } from '../tasks/wizard/appointmentForm'
import { choiceError, isValidPeriod, NO_COURTESY_CAR, periodOf, returnDateAfterMove, splitDateTime, suggestedPeriod } from './courtesyCarChoice'

const FORM: AppointmentForm = { ...EMPTY_APPOINTMENT, date: '2026-10-15', time: '08:00', endDate: '2026-10-15', endTime: '11:00' }

describe('suggestedPeriod', () => {
  it('from the start of the appointment to closing time of its last day (UX M-04: not the end of the lift slot)', () => {
    expect(suggestedPeriod(FORM)).toEqual({ pickupAt: '2026-10-15T08:00', returnAt: '2026-10-15T17:30' })
    // a later end stays
    expect(suggestedPeriod({ ...FORM, endTime: '18:00' })?.returnAt).toBe('2026-10-15T18:00')
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

describe('isValidPeriod', () => {
  it('only complete date-times with the return after the pickup', () => {
    expect(isValidPeriod('2026-10-15T08:00', '2026-10-15T17:00')).toBe(true)
    expect(isValidPeriod('2026-10-15T17:00', '2026-10-15T08:00')).toBe(false)
    expect(isValidPeriod(null, '2026-10-15T17:00')).toBe(false)
  })

  it('half-filled fields do not count – "T" would be after "2026…" as text', () => {
    expect(isValidPeriod('2026-10-20T', 'T')).toBe(false)
    expect(isValidPeriod('2026-10-20T08:00', '2026-10-20T')).toBe(false)
  })

  it('choiceError asks for the missing part instead of letting it through', () => {
    const wanted = { ...NO_COURTESY_CAR, wanted: true, courtesyCarId: 'c1' }
    expect(choiceError({ ...wanted, pickupAt: '2026-10-20T', returnAt: 'T' }, EMPTY_APPOINTMENT)).toBe('Abholung und Rückgabe angeben')
  })
})

describe('splitDateTime and returnDateAfterMove', () => {
  it('keeps the time while the date is being typed (the browser reports it empty)', () => {
    expect(splitDateTime('2026-10-21T08:00')).toEqual(['2026-10-21', '08:00'])
    expect(splitDateTime('T08:00')).toEqual(['', '08:00'])
    expect(splitDateTime('2026-10-21T')).toEqual(['2026-10-21', ''])
    expect(splitDateTime(null)).toEqual(['', ''])
  })

  it('a later pickup day moves the return day along', () => {
    expect(returnDateAfterMove('2026-10-21', '2026-10-23', '2026-10-22')).toBe('2026-10-24')
    expect(returnDateAfterMove('', '2026-10-23', '2026-10-22')).toBe('2026-10-22')
  })
})
