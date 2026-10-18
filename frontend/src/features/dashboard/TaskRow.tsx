import { Hourglass } from 'lucide-react'
import { Link } from 'react-router'
import type { Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { StatusIcon } from '../tasks/StatusIcon'
import { TASK_STATUS, type Task } from '../tasks/taskApi'
import { statusAccentClass } from '../tasks/taskStatusStyle'
import { periodLabel, startLabel } from '../tasks/taskTime'
import styles from './TaskRow.module.css'

/**
 * One appointment on the dashboard, compact: time, customer, mechanic – the status as the colored
 * bar plus its sign (UX M-12). Below: vehicle and what is done (UX G-20). A click opens the task.
 *
 * `oneLine` (the week): only the start, customer and the mechanic's initials – a TV cannot scroll,
 * so a busy day must still fit. The customer may take two lines rather than be cut off. The whole
 * period is in the tooltip.
 *
 * @param work what is done, e.g. "Radwechsel · Service" (workSummary)
 */
export function TaskRow({
  task,
  mechanic,
  liftName,
  work,
  oneLine = false,
}: {
  task: Task
  mechanic: Employee | undefined
  liftName?: string
  work?: string
  oneLine?: boolean
}) {
  const period = periodLabel(task)
  const customer = (
    <span className={styles.customer}>
      {task.waitingCustomer && <Hourglass aria-label="Wartekunde" className={styles.waiting} />}
      {task.customer.displayName}
    </span>
  )
  if (oneLine) {
    return (
      <Link
        to={`/tasks/${task.id}`}
        className={[styles.task, styles.oneLine, statusAccentClass(task.status)].join(' ')}
        title={`${period} · ${TASK_STATUS[task.status]}`}
      >
        <span className={styles.time}>
          <StatusIcon status={task.status} className={styles.status} />
          {startLabel(task, 'offen')}
        </span>
        {customer}
        {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} short />}
        <span className="visually-hidden">
          {period}, Status: {TASK_STATUS[task.status]}
        </span>
      </Link>
    )
  }
  const vehicle = [task.vehicle?.licensePlate, task.vehicle?.description].filter(Boolean).join(' · ')
  const second = [vehicle, work].filter(Boolean).join(' – ')
  return (
    <Link to={`/tasks/${task.id}`} className={[styles.task, statusAccentClass(task.status)].join(' ')} title={TASK_STATUS[task.status]}>
      <span className={styles.head}>
        <span className={styles.time}>
          <StatusIcon status={task.status} className={styles.status} />
          {period}
        </span>
        {liftName && <span className={styles.lift}>{liftName}</span>}
        {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} short />}
      </span>
      {customer}
      {second && <span className={styles.second}>{second}</span>}
      <span className="visually-hidden">Status: {TASK_STATUS[task.status]}</span>
    </Link>
  )
}
