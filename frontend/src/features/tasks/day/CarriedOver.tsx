import { CornerDownRight } from 'lucide-react'
import { Link } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { carriedLabel } from '../carriedOver'
import type { Task } from '../taskApi'
import styles from './CarriedOver.module.css'

/**
 * "Übertrag" (FB-14): tasks not finished on their day – in "Ohne Lift", without time and duration,
 * so they take no lift and overlap nothing. A tap opens the task; planned again it leaves the list.
 */
export function CarriedOver({ tasks, label = 'Übertrag – nicht fertig' }: { tasks: Task[]; label?: string }) {
  if (tasks.length === 0) return null
  return (
    <ul className={styles.list} aria-label={label}>
      {tasks.map((task) => (
        <li key={task.id}>
          <Link to={`/tasks/${task.id}`} className={styles.item} title="Nicht fertig geworden – öffnen, um neu einzuplanen">
            <CornerDownRight aria-hidden className={styles.icon} />
            <span className={styles.text}>
              <strong>{task.customer.displayName}</strong>
              {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
              <span className={styles.since}>{carriedLabel(task)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
