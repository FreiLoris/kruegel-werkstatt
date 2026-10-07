import type { AbsenceStatistics, PersonStatistics } from './absenceApi'

/**
 * The statistics view (9c) as pure calculations. Counting itself happens on the server – here
 * only what is shown: totals, the vacation bar, numbers as text.
 */

const daysFormat = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1 })

/** 2.5 → "2.5", 10 → "10", -1.5 → "−1.5" (a real minus, readable on the TV) */
export function formatDays(days: number): string {
  return daysFormat.format(days).replace('-', '−')
}

/** The vacation bar of a person: taken and planned as share of the entitlement */
export interface VacationBar {
  /** percent of the bar, together at most 100 */
  takenPercent: number
  plannedPercent: number
  /** more taken + planned than the entitlement */
  over: boolean
}

export function vacationBar(person: PersonStatistics): VacationBar {
  const { vacationEntitlement: entitlement, vacationTaken: taken, vacationPlanned: planned } = person
  const used = taken + planned
  // no entitlement (e.g. intern): any vacation is "over", the bar is full
  const scale = Math.max(entitlement, used, 1)
  return {
    takenPercent: (taken / scale) * 100,
    plannedPercent: (planned / scale) * 100,
    over: used > entitlement,
  }
}

/** The key figures above the tables */
export interface Totals {
  vacationTaken: number
  vacationPlanned: number
  sickDays: number
  externalWorkDays: number
  assignments: number
  companies: number
}

export function totalsOf(statistics: AbsenceStatistics): Totals {
  const sum = (pick: (p: PersonStatistics) => number) => statistics.people.reduce((total, p) => total + pick(p), 0)
  return {
    vacationTaken: sum((p) => p.vacationTaken),
    vacationPlanned: sum((p) => p.vacationPlanned),
    sickDays: sum((p) => p.sickDays),
    externalWorkDays: sum((p) => p.externalWorkDays),
    assignments: statistics.companies.reduce((total, c) => total + c.assignments, 0),
    companies: statistics.companies.length,
  }
}

/** "2026" from the address – otherwise this year */
export function yearFrom(text: string | null, currentYear: number): number {
  const year = Number(text)
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : currentYear
}
