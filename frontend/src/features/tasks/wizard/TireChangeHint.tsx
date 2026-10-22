import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate } from '../../../lib/format'
import { useCustomerHistory } from '../taskApi'
import { NO_APPOINTMENT } from '../taskTime'
import styles from './SameVehicleHint.module.css'
import { openTireChangesElsewhere } from './tireAppointment'

interface TireChangeHintProps {
  customerId: string
  vehicleId: string
  /** the chosen day; empty = none (yet) */
  date: string
  /** when editing: the task itself */
  taskId?: string
}

/**
 * "Radwechsel schon geplant" (FB-18) – e.g. the customer calls a second time. Looks at the
 * customer's last 10 tasks (upcoming first): enough for a tyre change, unless the customer has that
 * many open tasks. Only a hint, the links open in a new tab so the form stays filled.
 */
export function TireChangeHint({ customerId, vehicleId, date, taskId }: TireChangeHintProps) {
  const history = useCustomerHistory(customerId)
  const others = openTireChangesElsewhere(history.data ?? [], vehicleId, date, taskId)
  if (others.length === 0) return null

  return (
    <div className={styles.hint} role="status">
      <TriangleAlert aria-hidden className={styles.icon} />
      <div>
        <p className={styles.title}>Für dieses Fahrzeug ist schon ein Radwechsel erfasst – nicht doppelt?</p>
        <ul className={styles.list}>
          {others.map((task) => (
            <li key={task.id}>
              <Link to={`/tasks/${task.id}`} target="_blank" rel="noopener noreferrer">
                {task.taskNumber ?? 'Auftrag'}
              </Link>{' '}
              · {task.date ? formatDate(task.date) : NO_APPOINTMENT}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
