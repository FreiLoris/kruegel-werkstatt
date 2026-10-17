import { useToday } from '../../lib/clock'
import { Link } from 'react-router'
import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate } from '../../lib/format'
import { useAbsences } from '../absences/absenceApi'
import { AbsenceChip } from '../absences/AbsenceChip'
import { absencesOn } from '../absences/absenceDays'
import { useAllEmployees } from '../employees/employeeApi'
import { usePublicHolidays } from '../publicholidays/publicHolidayApi'
import { MfkEntry } from '../tasks/mfk/MfkEntry'
import { mfkSlotsOn } from '../tasks/mfk/mfkSlots'
import { useMfkSlots, useTasksBetween } from '../tasks/taskApi'
import { weekDays } from '../tasks/week/weekDays'
import styles from './DashboardWeek.module.css'
import { TaskRow } from './TaskRow'

/** Appointments per day – a TV cannot scroll; the rest is "+ n weitere" (the day view has all) */
const MAX_ROWS = 6

/**
 * The week on the dashboard (10a): every day with a clear head (UI review: the old grid had none),
 * who is away and the appointments as compact rows. Only to look at – planning happens under
 * "Termine"; a click opens the task.
 */
export function DashboardWeek({ monday }: { monday: string }) {
  const sunday = addDays(monday, 6)
  const tasks = useTasksBetween(monday, sunday)
  const { data: mfkSlots } = useMfkSlots(monday, sunday)
  const absences = useAbsences(monday, sunday)
  const { data: holidays } = usePublicHolidays(monday, sunday)
  const { data: employees } = useAllEmployees()
  const today = useToday()

  // the data wins: after a backend restart the TV keeps the week instead of an error until the next refetch
  if (!tasks.data) return <p className="muted">{tasks.error ? `Termine konnten nicht geladen werden: ${tasks.error.message}` : 'Lade Woche …'}</p>

  const days = weekDays(monday, tasks.data, mfkSlots?.map((s) => s.date))
  const holidayOf = new Map((holidays ?? []).map((h) => [h.date, h.name]))
  const employeeOf = (id: string | null | undefined) => employees?.find((e) => e.id === id)

  return (
    <div className={styles.week} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(9rem, 1fr))` }}>
      {days.map((day) => {
        const holiday = holidayOf.get(day.date)
        const away = absencesOn(absences.data ?? [], day.date)
        const mfk = mfkSlotsOn(mfkSlots ?? [], day.date)
        // the MFK appointments take rows of the TV too – at least one appointment stays visible
        const rows = Math.max(MAX_ROWS - mfk.length, 1)
        return (
          <section
            key={day.date}
            className={[styles.day, day.date === today && styles.today, holiday && styles.holiday].filter(Boolean).join(' ')}
            aria-label={`${WEEKDAYS_SHORT[weekdayOf(day.date)]} ${formatDate(day.date)}`}
          >
            <header className={styles.head}>
              <span className={styles.weekday}>{WEEKDAYS_SHORT[weekdayOf(day.date)]}</span>
              <span className={styles.date}>{formatDate(day.date).slice(0, 6)}</span>
              <span className={styles.meta}>{holiday ?? (day.tasks.length === 1 ? '1 Termin' : `${day.tasks.length} Termine`)}</span>
            </header>
            {away.length > 0 && (
              <div className={styles.absences} aria-label="Abwesend und anwesend">
                {/* without the person's name (list not loaded yet) a chip would say "Ferien" for nobody */}
                {away.map((a) => {
                  const name = employeeOf(a.absence.employeeId)?.name
                  return name && <AbsenceChip key={a.absence.id} day={a} name={name} />
                })}
              </div>
            )}
            <ul className={styles.tasks}>
              {mfk.map((slot) => (
                <li key={`mfk-${slot.task.id}`}>
                  <MfkEntry slot={slot} driver={employeeOf(slot.task.mfkDriverId)} oneLine />
                </li>
              ))}
              {day.tasks.slice(0, rows).map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} mechanic={employeeOf(task.mechanicId)} oneLine />
                </li>
              ))}
              {day.tasks.length > rows && (
                <li>
                  <Link to={`/tasks?date=${day.date}`} className={styles.more}>
                    + {day.tasks.length - rows} weitere
                  </Link>
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
