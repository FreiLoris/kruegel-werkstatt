import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate } from '../../../lib/format'
import { useAllLifts } from '../../lifts/liftApi'
import { useTasksOfDay, useTasksWithoutAppointment, type AnyTask } from '../taskApi'
import { NO_APPOINTMENT, periodLabel } from '../taskTime'
import { openTasksOfVehicle } from './sameVehicle'
import styles from './SameVehicleHint.module.css'

interface SameVehicleHintProps {
  /** only rendered with a vehicle – with "Fahrzeug noch offen" there is nothing to compare */
  vehicleId: string
  /** the chosen day; empty = no appointment (yet) – then only the list "Ohne Termin" is checked */
  date: string
  /** when editing: the task itself */
  taskId?: string
}

/**
 * "This car already has a task" (FB-01) – on the chosen day or in the list "Ohne Termin". Only a
 * hint: the car may come twice on purpose. The links open in a new tab, so the form stays filled.
 */
export function SameVehicleHint({ vehicleId, date, taskId }: SameVehicleHintProps) {
  const ofDay = useTasksOfDay(date || undefined)
  const unplanned = useTasksWithoutAppointment()
  const { data: lifts } = useAllLifts()

  const others = openTasksOfVehicle([...(date ? (ofDay.data ?? []) : []), ...(unplanned.data ?? [])], vehicleId, taskId)
  if (others.length === 0) return null

  const liftName = (id: string | null) => lifts?.find((l) => l.id === id)?.name
  const where = (task: AnyTask) => {
    if (task.date === null || task.time === null || task.endAt === null) return NO_APPOINTMENT
    const lift = liftName(task.liftId)
    return [formatDate(task.date), periodLabel({ date: task.date, time: task.time, endAt: task.endAt, timeOpen: task.timeOpen }), lift]
      .filter(Boolean)
      .join(' · ')
  }

  return (
    <div className={styles.hint} role="status">
      <TriangleAlert aria-hidden className={styles.icon} />
      <div>
        <p className={styles.title}>Dieses Fahrzeug hat schon einen offenen Auftrag – nicht doppelt erfassen?</p>
        <ul className={styles.list}>
          {others.map((task) => (
            <li key={task.id}>
              <Link to={`/tasks/${task.id}`} target="_blank" rel="noopener noreferrer">
                {task.taskNumber ?? 'Auftrag'}
              </Link>{' '}
              · {where(task)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
