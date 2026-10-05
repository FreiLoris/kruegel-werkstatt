import { Hourglass } from 'lucide-react'
import type { HTMLAttributes, Ref } from 'react'
import { useNavigate } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { formatTime } from '../../../lib/format'
import type { Employee } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import type { Task } from '../taskApi'
import { TASK_STATUS } from '../taskApi'
import { statusAccentClass } from '../taskStatusStyle'
import styles from './WeekCard.module.css'

interface WeekCardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task
  mechanic: Employee | undefined
  liftName: string | undefined
  dragging?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * Compact card for the week: time, customer, plate, lift and mechanic. Status as colored bar +
 * tooltip. Click or Enter opens the task; keyboard dragging starts with space.
 */
export function WeekCard({ task, mechanic, liftName, dragging = false, className, onKeyDown, ...rest }: WeekCardProps) {
  const navigate = useNavigate()
  const open = () => navigate(`/tasks/${task.id}`)
  return (
    <div
      className={[styles.card, statusAccentClass(task.status), dragging && styles.dragging, className].filter(Boolean).join(' ')}
      title={TASK_STATUS[task.status]}
      // focusable and a button also without drag & drop (view-only device); dnd-kit's attributes come after
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
        else onKeyDown?.(e)
      }}
      {...rest}
    >
      <div className={styles.top}>
        <span className={styles.time}>{formatTime(task.time)}</span>
        <span className={styles.lift}>{liftName ?? 'ohne Lift'}</span>
      </div>
      <p className={styles.customer}>
        {task.waitingCustomer && <Hourglass aria-label="Wartekunde" className={styles.waiting} />}
        {task.customer.displayName}
      </p>
      <div className={styles.bottom}>
        {task.vehicle?.licensePlate ? (
          <LicensePlate text={task.vehicle.licensePlate} size="sm" />
        ) : (
          <span className="muted">{task.vehicle ? task.vehicle.description : 'Fahrzeug offen'}</span>
        )}
        {mechanic && <NameBadge name={mechanic.name} color={mechanic.color} />}
      </div>
      <span className="visually-hidden">Status: {TASK_STATUS[task.status]}</span>
    </div>
  )
}
