import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate, formatTime, todayIso } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { useAllLifts } from '../lifts/liftApi'
import { useTasksBetween, useTasksOfDay } from '../tasks/taskApi'
import { TaskRow } from './TaskRow'
import styles from './TodayByLift.module.css'
import { liftColumns, nextAppointment } from './todayColumns'

/** How far ahead "nächster Termin" looks when today is empty */
const LOOK_AHEAD_DAYS = 60

/**
 * Today by lift (10b): what is on which lift – also the task from yesterday that is still up.
 * An empty lift says "frei"; a day without any appointment names the next one instead of showing
 * an empty black area (UI review).
 */
export function TodayByLift() {
  const today = todayIso()
  const tasks = useTasksOfDay(today)
  const ahead = useTasksBetween(addDays(today, 1), addDays(today, LOOK_AHEAD_DAYS))
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()

  if (tasks.error) return <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>
  if (!tasks.data || !lifts) return <p className="muted">Lade heutige Termine …</p>

  const mechanicOf = (id: string | null) => employees?.find((e) => e.id === id)

  if (tasks.data.length === 0) {
    const next = ahead.data ? nextAppointment(ahead.data, today) : undefined
    return (
      <div className={styles.empty}>
        <strong>Keine Termine heute</strong>
        {next ? (
          <span>
            Nächster: {WEEKDAYS_SHORT[weekdayOf(next.date)]} {formatDate(next.date).slice(0, 6)} {formatTime(next.time)} · {next.customer.displayName}
          </span>
        ) : (
          ahead.data && <span>Auch in den nächsten {LOOK_AHEAD_DAYS} Tagen nichts geplant.</span>
        )}
      </div>
    )
  }

  const columns = liftColumns(tasks.data, lifts)
  return (
    <div className={styles.lifts} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(9rem, 1fr))` }}>
      {columns.map((column) => (
        <section key={column.id} className={styles.lift} aria-label={column.name}>
          <h3 className={styles.name}>{column.name}</h3>
          {column.tasks.length === 0 ? (
            <p className={styles.free}>frei</p>
          ) : (
            <ul className={styles.tasks}>
              {column.tasks.map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} mechanic={mechanicOf(task.mechanicId)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
