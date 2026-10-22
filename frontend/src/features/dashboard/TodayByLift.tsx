import { useMyEmployeeId } from '../../app/person/useDevicePerson'
import { useToday } from '../../lib/clock'
import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { useAllLifts } from '../lifts/liftApi'
import { useAllServiceItems } from '../service-items/serviceItemApi'
import { MfkEntry } from '../tasks/mfk/MfkEntry'
import { useCarriedOver, useMfkSlots, useTasksBetween, useTasksOfDay } from '../tasks/taskApi'
import { workSummary } from '../tasks/workSummary'
import { TaskRow } from './TaskRow'
import styles from './TodayByLift.module.css'
import { liftColumns, nextAppointment, NO_LIFT } from './todayColumns'
import { startLabel } from '../tasks/taskTime'
import { CarriedOver } from '../tasks/day/CarriedOver'

/** How far ahead "nächster Termin" looks when today is empty */
const LOOK_AHEAD_DAYS = 60

/**
 * Today by lift (10b): what is on which lift – also the task from yesterday that is still up.
 * An empty lift says "frei"; a day without any appointment names the next one instead of showing
 * an empty black area (UI review).
 */
export function TodayByLift() {
  const today = useToday()
  const me = useMyEmployeeId()
  const tasks = useTasksOfDay(today)
  const { data: mfkSlots = [] } = useMfkSlots(today, today)
  // not finished on their day (FB-14): still in the workshop, "Ohne Lift"
  const { data: carriedOver = [] } = useCarriedOver(today)
  const ahead = useTasksBetween(addDays(today, 1), addDays(today, LOOK_AHEAD_DAYS))
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()

  // the data wins: after a backend restart the TV keeps today's tasks instead of an error
  if (!tasks.data || !lifts) {
    return <p className="muted">{!tasks.data && tasks.error ? `Termine konnten nicht geladen werden: ${tasks.error.message}` : 'Lade heutige Termine …'}</p>
  }

  const mechanicOf = (id: string | null) => employees?.find((e) => e.id === id)
  const serviceItemNames = new Map((serviceItems ?? []).map((s) => [s.id, s.name]))

  if (tasks.data.length === 0 && mfkSlots.length === 0 && carriedOver.length === 0) {
    const next = ahead.data ? nextAppointment(ahead.data, today) : undefined
    return (
      <div className={styles.empty}>
        <strong>Keine Termine heute</strong>
        {next ? (
          <span>
            Nächster: {WEEKDAYS_SHORT[weekdayOf(next.date)]} {formatDate(next.date).slice(0, 6)} {startLabel(next)} · {next.customer.displayName}
          </span>
        ) : (
          ahead.data && <span>Auch in den nächsten {LOOK_AHEAD_DAYS} Tagen nichts geplant.</span>
        )}
      </div>
    )
  }

  // the MFK appointments stand in "Ohne Lift" – they take no lift (FB-10)
  const columns = liftColumns(tasks.data, lifts, mfkSlots.length > 0 || carriedOver.length > 0)
  return (
    // columns shrink rather than scroll – nobody scrolls on the TV
    <div className={styles.lifts} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((column) => (
        <section key={column.id} className={styles.lift} aria-label={column.name}>
          <h3 className={styles.name}>{column.name}</h3>
          {column.tasks.length === 0 && column.id !== NO_LIFT ? (
            <p className={styles.free}>frei</p>
          ) : (
            <ul className={styles.tasks}>
              {column.id === NO_LIFT && carriedOver.length > 0 && (
                <li>
                  <CarriedOver tasks={carriedOver} />
                </li>
              )}
              {column.id === NO_LIFT &&
                mfkSlots.map((slot) => (
                  <li key={`mfk-${slot.task.id}`}>
                    <MfkEntry slot={slot} driver={mechanicOf(slot.task.mfkDriverId)} />
                  </li>
                ))}
              {column.tasks.map((task) => (
                <li key={task.id}>
                  <TaskRow
                    task={task}
                    mechanic={mechanicOf(task.mechanicId)}
                    work={workSummary(task, serviceItemNames)}
                    mine={me !== undefined && task.mechanicId === me}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
