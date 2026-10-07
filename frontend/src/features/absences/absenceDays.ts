import type { Absence } from './absenceApi'

/** Which part of a day someone is away */
export type DayPart = 'full' | 'morning' | 'afternoon'

/** An absence as seen on one day */
export interface AbsenceOnDay {
  absence: Absence
  part: DayPart
}

/**
 * Who is away on `date` and for which part of it: the first day may start at noon (afternoon),
 * the last day may end at noon (morning). Sorted morning – full – afternoon, then by start.
 */
export function absencesOn(absences: Absence[], date: string): AbsenceOnDay[] {
  const order: Record<DayPart, number> = { morning: 0, full: 1, afternoon: 2 }
  return absences
    .filter((a) => a.startDate <= date && date <= a.endDate)
    .map((absence) => ({ absence, part: partOn(absence, date) }))
    .sort((a, b) => order[a.part] - order[b.part] || a.absence.startDate.localeCompare(b.absence.startDate))
}

function partOn(absence: Absence, date: string): DayPart {
  if (date === absence.startDate && absence.startsAfternoon) return 'afternoon'
  if (date === absence.endDate && absence.endsNoon) return 'morning'
  return 'full'
}

/** "Vormittag" / "Nachmittag" / "" – shown next to the name */
export function partLabel(part: DayPart): string {
  return part === 'morning' ? 'Vormittag' : part === 'afternoon' ? 'Nachmittag' : ''
}
