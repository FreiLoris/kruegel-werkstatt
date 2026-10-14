import { ABSENCE_CATEGORY, type Absence } from '../absences/absenceApi'
import { absencesOn, dayLabel, partLabel, type DayPart } from '../absences/absenceDays'
import type { Employee } from '../employees/employeeApi'

/** Someone who is in today – `part` when only for half the day */
export interface Present {
  employee: Employee
  part: DayPart
  /** shown next to the name: "Vormittag", "ab 10:30" (FB-05); empty = the whole day */
  label: string
}

/** Someone who would be in today but is away – with the reason in words */
export interface Away {
  employee: Employee
  /** "Ferien", "Fremdarbeit Garage Muster AG", "Ferien (Vormittag)" for half a day, "Krank bis 10:30" with times */
  reason: string
}

export interface Presence {
  present: Present[]
  away: Away[]
}

const OTHER_HALF: Record<DayPart, DayPart | null> = { full: null, morning: 'afternoon', afternoon: 'morning' }

/** Away "bis 10:30" → in "ab 10:30"; "ab 14:00" → "bis 14:00"; "09:00–10:30" → "ausser 09:00–10:30" */
function otherTime(time: string): string {
  if (time.startsWith('bis ')) return `ab ${time.slice(4)}`
  if (time.startsWith('ab ')) return `bis ${time.slice(3)}`
  return `ausser ${time}`
}

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
      if (presentEntries.length > 1) present.push({ employee, part: 'full', label: '' })
      else if (presentEntries.length === 1) present.push({ employee, part: presentEntries[0].part, label: dayLabel(presentEntries[0]) })
      continue
    }
    if (!workingDay) continue

    for (const entry of awayEntries) {
      const what =
        entry.absence.category === 'EXTERNAL_WORK' && entry.absence.company
          ? `${ABSENCE_CATEGORY.EXTERNAL_WORK} ${entry.absence.company}`
          : ABSENCE_CATEGORY[entry.absence.category]
      // "Krank bis 10:30" like the workshop's example (FB-05) – "Ferien (Vormittag)" for half days
      const reason = entry.time ? `${what} ${entry.time}` : entry.part !== 'full' ? `${what} (${dayLabel(entry)})` : what
      away.push({ employee, reason })
    }
    if (awayEntries.length === 0) {
      present.push({ employee, part: 'full', label: '' })
    } else if (awayEntries.length === 1) {
      const [only] = awayEntries
      if (only.time) {
        // away for some hours (FB-05) → in for the rest of the day
        present.push({ employee, part: OTHER_HALF[only.part] ?? 'full', label: otherTime(only.time) })
      } else {
        // away for one half → in for the other
        const other = OTHER_HALF[only.part]
        if (other) present.push({ employee, part: other, label: partLabel(other) })
      }
    }
  }
  return { present, away }
}
