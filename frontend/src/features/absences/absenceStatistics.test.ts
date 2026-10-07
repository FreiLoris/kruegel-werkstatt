import { describe, expect, it } from 'vitest'
import type { AbsenceStatistics, PersonStatistics } from './absenceApi'
import { formatDays, totalsOf, vacationBar, yearFrom } from './absenceStatistics'

const person = (vacationEntitlement: number, vacationTaken: number, vacationPlanned: number) =>
  ({ vacationEntitlement, vacationTaken, vacationPlanned }) as PersonStatistics

describe('formatDays', () => {
  it('half days with a point, whole days without, minus readable', () => {
    expect(formatDays(2.5)).toBe('2.5')
    expect(formatDays(10)).toBe('10')
    expect(formatDays(-1.5)).toBe('−1.5')
  })
})

describe('vacationBar', () => {
  it('taken and planned as share of the entitlement', () => {
    expect(vacationBar(person(25, 10, 5))).toEqual({ takenPercent: 40, plannedPercent: 20, over: false })
  })

  it('more than the entitlement: the bar is full and says so', () => {
    const bar = vacationBar(person(20, 18, 7))

    expect(bar.takenPercent + bar.plannedPercent).toBe(100)
    expect(bar.over).toBe(true)
  })

  it('no entitlement and no vacation: an empty bar, no division by zero', () => {
    expect(vacationBar(person(0, 0, 0))).toEqual({ takenPercent: 0, plannedPercent: 0, over: false })
  })
})

describe('totalsOf', () => {
  it('adds up people and companies', () => {
    const statistics = {
      year: 2026,
      people: [
        { vacationTaken: 3, vacationPlanned: 2, sickDays: 1, externalWorkDays: 0.5 },
        { vacationTaken: 1.5, vacationPlanned: 0, sickDays: 0, externalWorkDays: 2 },
      ],
      companies: [{ assignments: 2 }, { assignments: 1 }],
    } as unknown as AbsenceStatistics

    expect(totalsOf(statistics)).toEqual({ vacationTaken: 4.5, vacationPlanned: 2, sickDays: 1, externalWorkDays: 2.5, assignments: 3, companies: 2 })
  })
})

describe('yearFrom', () => {
  it('only plausible years from the address', () => {
    expect(yearFrom('2025', 2026)).toBe(2025)
    expect(yearFrom('abc', 2026)).toBe(2026)
    expect(yearFrom('1850', 2026)).toBe(2026)
    expect(yearFrom(null, 2026)).toBe(2026)
  })
})
