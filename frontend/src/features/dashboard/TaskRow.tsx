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
 * Every card has the same lines, so all are equally high (a calm board): time and mechanic on top,
 * the customer below, then vehicle and work. A long text ends in "…" – the tooltip has it all.
 *
 * `compact` (the week): one line – start, customer, the mechanic's initials. A TV cannot scroll, so
 * a busy day must still fit. The whole period is in the tooltip.
 *
 * @param work what is done, e.g. "Radwechsel · Service" (workSummary)
 */
export function TaskRow({
  task,
  mechanic,
  liftName,
  work,
  compact = false,
  mine = false,
}: {
  task: Task
  mechanic: Employee | undefined
  liftName?: string
  work?: string
  compact?: boolean
  /** the mechanic is the person of this device – framed, so "my work" is found at a glance (UX M-13) */
  mine?: boolean
}) {
  const period = periodLabel(task)
  const vehicle = [task.vehicle?.licensePlate, task.vehicle?.description].filter(Boolean).join(' · ')
  const second = [vehicle, work].filter(Boolean).join(' – ')
  return (
    <Link
      to={`/tasks/${task.id}`}
      className={[styles.task, compact && styles.compact, statusAccentClass(task.status), mine && styles.mine].filter(Boolean).join(' ')}
      title={`${task.customer.displayName} · ${period} · ${TASK_STATUS[task.status]}`}
    >
      <span className={styles.head}>
        <span className={styles.time}>
          <StatusIcon status={task.status} className={styles.status} />
          {compact ? startLabel(task, 'offen') : period}
        </span>
        {liftName && <span className={styles.lift}>{liftName}</span>}
        {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} short />}
      </span>
      <span className={styles.customer}>
        {task.waitingCustomer && <Hourglass aria-label="Wartekunde" className={styles.waiting} />}
        {task.customer.displayName}
      </span>
      {/* always there, also empty – every card of a column equally high */}
      {!compact && <span className={styles.second}>{second || ' '}</span>}
      <span className="visually-hidden">
        {compact && `${period}, `}Status: {TASK_STATUS[task.status]}
        {mine && ', dein Auftrag'}
      </span>
    </Link>
  )
}
