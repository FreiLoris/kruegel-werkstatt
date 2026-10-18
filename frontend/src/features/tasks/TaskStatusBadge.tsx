import styles from './taskStatus.module.css'
import { StatusIcon } from './StatusIcon'
import { TASK_STATUS, type TaskStatus } from './taskApi'
import { legendClass, statusBadgeClass } from './taskStatusStyle'

/** Status as a small colored label – the text is always there, color and sign are only a help. */
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={statusBadgeClass(status)}>
      <StatusIcon status={status} className={styles.icon} />
      {TASK_STATUS[status]}
    </span>
  )
}

/**
 * All statuses with color and sign – shown once per view. Plain text with a sign, no frame: framed
 * it looked like filter buttons to click (UX M-12).
 */
export function TaskStatusLegend() {
  return (
    <ul className={legendClass} aria-label="Legende Status">
      {(Object.keys(TASK_STATUS) as TaskStatus[]).map((status) => (
        <li key={status} className={statusBadgeClass(status)}>
          <StatusIcon status={status} className={styles.icon} />
          {TASK_STATUS[status]}
        </li>
      ))}
    </ul>
  )
}
