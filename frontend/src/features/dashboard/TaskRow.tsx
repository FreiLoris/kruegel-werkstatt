import { Hourglass } from 'lucide-react'
import { Link } from 'react-router'
import { formatTime } from '../../lib/format'
import type { Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { TASK_STATUS, type Task } from '../tasks/taskApi'
import { statusAccentClass } from '../tasks/taskStatusStyle'
import { timeRange } from '../tasks/taskTime'
import styles from './TaskRow.module.css'

/**
 * One appointment on the dashboard, compact: time, customer, lift + mechanic – the status as the
 * colored bar (and in words for screen readers). A click opens the task.
 *
 * `oneLine` (the week): only the start, customer and mechanic in one line – a TV cannot scroll,
 * so a busy day must still fit. The whole period is in the tooltip.
 */
export function TaskRow({ task, mechanic, liftName, oneLine = false }: { task: Task; mechanic: Employee | undefined; liftName?: string; oneLine?: boolean }) {
  const period = timeRange(task.date, task.time, task.endAt)
  if (oneLine) {
    return (
      <Link
        to={`/tasks/${task.id}`}
        className={[styles.task, styles.oneLine, statusAccentClass(task.status)].join(' ')}
        title={`${period} · ${TASK_STATUS[task.status]}`}
      >
        <span className={styles.time}>{formatTime(task.time)}</span>
        <span className={styles.customer}>
          {task.waitingCustomer && <Hourglass aria-label="Wartekunde" className={styles.waiting} />}
          {task.customer.displayName}
        </span>
        {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
        <span className="visually-hidden">
          {period}, Status: {TASK_STATUS[task.status]}
        </span>
      </Link>
    )
  }
  return (
    <Link to={`/tasks/${task.id}`} className={[styles.task, statusAccentClass(task.status)].join(' ')} title={TASK_STATUS[task.status]}>
      <span className={styles.time}>{period}</span>
      <span className={styles.customer}>
        {task.waitingCustomer && <Hourglass aria-label="Wartekunde" className={styles.waiting} />}
        {task.customer.displayName}
      </span>
      {(liftName || mechanic) && (
        <span className={styles.details}>
          {liftName && <span className={styles.lift}>{liftName}</span>}
          {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
        </span>
      )}
      <span className="visually-hidden">Status: {TASK_STATUS[task.status]}</span>
    </Link>
  )
}
