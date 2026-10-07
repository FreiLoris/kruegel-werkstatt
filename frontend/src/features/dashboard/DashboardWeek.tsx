import { Hourglass } from 'lucide-react'
import { Link } from 'react-router'
import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../lib/format'
import { useAbsences } from '../absences/absenceApi'
import { AbsenceChip } from '../absences/AbsenceChip'
import { absencesOn } from '../absences/absenceDays'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { useAllLifts } from '../lifts/liftApi'
import { usePublicHolidays } from '../publicholidays/publicHolidayApi'
import { TASK_STATUS, useTasksBetween, type Task } from '../tasks/taskApi'
import { statusAccentClass } from '../tasks/taskStatusStyle'
import { timeRange } from '../tasks/taskTime'
import { weekDays } from '../tasks/week/weekDays'
import styles from './DashboardWeek.module.css'

/**
 * The week on the dashboard (10a): every day with a clear head (UI review: the old grid had none),
 * who is away and the appointments as compact rows. Only to look at – planning happens under
 * "Termine"; a click opens the task.
 */
export function DashboardWeek({ monday }: { monday: string }) {
  const sunday = addDays(monday, 6)
  const tasks = useTasksBetween(monday, sunday)
  const absences = useAbsences(monday, sunday)
  const { data: holidays } = usePublicHolidays(monday, sunday)
  const { data: employees } = useAllEmployees()
  const { data: lifts } = useAllLifts()
  const today = todayIso()

  if (tasks.error) return <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>
  if (!tasks.data) return <p className="muted">Lade Woche …</p>

  const days = weekDays(monday, tasks.data)
  const holidayOf = new Map((holidays ?? []).map((h) => [h.date, h.name]))
  const employeeOf = (id: string | null | undefined) => employees?.find((e) => e.id === id)
  const liftOf = (task: Task) => lifts?.find((l) => l.id === task.liftId)?.name

  return (
    <div className={styles.week} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(9rem, 1fr))` }}>
      {days.map((day) => {
        const holiday = holidayOf.get(day.date)
        const away = absencesOn(absences.data ?? [], day.date)
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
              <div className={styles.absences} aria-label="Abwesend">
                {away.map((a) => (
                  <AbsenceChip key={a.absence.id} day={a} name={employeeOf(a.absence.employeeId)?.name ?? ''} />
                ))}
              </div>
            )}
            <ul className={styles.tasks}>
              {day.tasks.map((task) => {
                const mechanic = employeeOf(task.mechanicId)
                const lift = liftOf(task)
                return (
                  <li key={task.id}>
                    <Link to={`/tasks/${task.id}`} className={[styles.task, statusAccentClass(task.status)].join(' ')} title={TASK_STATUS[task.status]}>
                      <span className={styles.time}>{timeRange(task.date, task.time, task.endAt)}</span>
                      <span className={styles.customer}>
                        {task.waitingCustomer && <Hourglass aria-label="Wartekunde" className={styles.waiting} />}
                        {task.customer.displayName}
                      </span>
                      <span className={styles.details}>
                        {lift && <span className={styles.lift}>{lift}</span>}
                        {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
                      </span>
                      <span className="visually-hidden">Status: {TASK_STATUS[task.status]}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
