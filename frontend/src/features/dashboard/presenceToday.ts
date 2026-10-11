import { ABSENCE_CATEGORY, type Absence } from '../absences/absenceApi'
import { absencesOn, partLabel, type DayPart } from '../absences/absenceDays'
import type { Employee } from '../employees/employeeApi'

/** Someone who is in today – `part` when only for half the day */
export interface Present {
  employee: Employee
  part: DayPart
}

/** Someone who would be in today but is away – with the reason in words */
export interface Away {
  employee: Employee
  /** "Ferien", "Fremdarbeit Garage Muster AG", with "(Vormittag)" for half a day */
  reason: string
}

export interface Presence {
  present: Present[]
  away: Away[]
}

const OTHER_HALF: Record<DayPart, DayPart | null> = { full: null, morning: 'afternoon', afternoon: 'morning' }

/**
 * Who is in the workshop on `date` (12h) – from the settings of the people, nobody is named here:
 *
 * - regular hours: in on every working day, unless an absence says otherwise. Half a day away =
 *   in for the other half, and listed as away for that half.
 * - flexible hours: in only when entered as "Anwesend" (for that part of the day); otherwise the
 *   person is not expected and appears in neither list.
 * - on a weekend or public holiday nobody with regular hours is expected.
 *
 * Only active people, in the order of the employee list.
 */
export function presenceOn(employees: Employee[], absences: Absence[], date: string, workingDay: boolean): Presence {
  const today = absencesOn(absences, date)
  const present: Present[] = []
  const away: Away[] = []

  for (const employee of employees.filter((e) => e.active)) {
    const entries = today.filter((entry) => entry.absence.employeeId === employee.id)
    const awayEntries = entries.filter((entry) => entry.absence.category !== 'PRESENT')
    const presentEntries = entries.filter((entry) => entry.absence.category === 'PRESENT')

    if (employee.flexibleHours) {
      // morning and afternoon entered separately = the whole day
      if (presentEntries.length > 0) present.push({ employee, part: presentEntries.length > 1 ? 'full' : presentEntries[0].part })
      continue
    }
    if (!workingDay) continue

    for (const entry of awayEntries) {
      const what =
        entry.absence.category === 'EXTERNAL_WORK' && entry.absence.company
          ? `${ABSENCE_CATEGORY.EXTERNAL_WORK} ${entry.absence.company}`
          : ABSENCE_CATEGORY[entry.absence.category]
      const half = partLabel(entry.part)
      away.push({ employee, reason: half ? `${what} (${half})` : what })
    }
    if (awayEntries.length === 0) {
      present.push({ employee, part: 'full' })
    } else if (awayEntries.length === 1) {
      // away for one half → in for the other
      const other = OTHER_HALF[awayEntries[0].part]
      if (other) present.push({ employee, part: other })
    }
  }
  return { present, away }
}
