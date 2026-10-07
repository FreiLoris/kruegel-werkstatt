import { Hourglass } from 'lucide-react'
import { Link } from 'react-router'
import type { Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { TASK_STATUS, type Task } from '../tasks/taskApi'
import { statusAccentClass } from '../tasks/taskStatusStyle'
import { timeRange } from '../tasks/taskTime'
import styles from './TaskRow.module.css'

/**
 * One appointment on the dashboard, compact: time, customer, lift + mechanic – the status as the
 * colored bar (and in words for screen readers). A click opens the task.
 */
export function TaskRow({ task, mechanic, liftName }: { task: Task; mechanic: Employee | undefined; liftName?: string }) {
  return (
    <Link to={`/tasks/${task.id}`} className={[styles.task, statusAccentClass(task.status)].join(' ')} title={TASK_STATUS[task.status]}>
      <span className={styles.time}>{timeRange(task.date, task.time, task.endAt)}</span>
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
