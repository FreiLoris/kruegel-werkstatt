import { describe, expect, it } from 'vitest'
import { planSummary, skippedDays, toSeriesRequest, type SeriesValues } from './absenceSeries'

// fictitious
const values: SeriesValues = {
  employeeId: 'd',
  category: 'EXTERNAL_WORK',
  company: ' Garage Muster ',
  note: '',
  startDate: '2026-11-02',
  startsAfternoon: false,
  startTime: '07:30',
  endDate: '2027-01-29',
  endsNoon: false,
  endTime: '',
  weekdays: ['MONDAY', 'TUESDAY', 'THURSDAY'],
  everyOtherWeek: false,
}

describe('absenceSeries (FB-33)', () => {
  it('builds the request – times for everything but vacation', () => {
    expect(toSeriesRequest(values)).toMatchObject({ company: 'Garage Muster', from: '2026-11-02', to: '2027-01-29', startTime: '07:30', endTime: null })
    expect(toSeriesRequest({ ...values, category: 'VACATION', startsAfternoon: true, endsNoon: true })).toMatchObject({
      company: undefined,
      startTime: null,
      // one day cannot be "from noon" and "until noon"
      startsAfternoon: true,
      endsNoon: false,
    })
  })

  it('no request while something needed is missing', () => {
    expect(toSeriesRequest({ ...values, weekdays: [] })).toBeNull()
    expect(toSeriesRequest({ ...values, company: ' ' })).toBeNull()
    expect(toSeriesRequest({ ...values, endDate: '2026-11-01' })).toBeNull()
    expect(toSeriesRequest({ ...values, employeeId: '' })).toBeNull()
  })

  it('says how many entries, from when to when – and which days it leaves out, by date', () => {
    const plan = {
      days: ['2026-11-02', '2027-01-28'],
      holidays: ['2026-12-25'],
      conflicts: [{ day: '2026-11-05', reason: 'bereits als Ferien eingetragen' }],
    }
    expect(planSummary(plan)).toBe('Erstellt 2 Einträge vom 02.11.2026 bis 28.01.2027')
    expect(planSummary({ ...plan, days: ['2026-11-02'] })).toBe('Erstellt 1 Eintrag am 02.11.2026')
    expect(planSummary({ ...plan, days: [] })).toBe('Kein freier Tag mit diesen Wochentagen in diesem Zeitraum')
    expect(skippedDays(plan)).toEqual(['05.11.2026 – bereits als Ferien eingetragen', '25.12.2026 – Feiertag'])
  })
})
