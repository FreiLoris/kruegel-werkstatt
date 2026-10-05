import { CarFront, Hourglass } from 'lucide-react'
import type { HTMLAttributes, Ref } from 'react'
import { useNavigate } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import type { Employee } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import type { Task } from '../taskApi'
import { TASK_STATUS } from '../taskApi'
import { statusAccentClass } from '../taskStatusStyle'
import { timeRange, timeSeenFrom } from '../taskTime'
import styles from './WeekCard.module.css'

interface WeekCardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task
  mechanic: Employee | undefined
  liftName: string | undefined
  dragging?: boolean
  /** name of the courtesy car the customer has for this task */
  courtesyCar?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * Compact card for the week: time, customer, plate, lift and mechanic. Status as colored bar +
 * tooltip. Click or Enter opens the task; keyboard dragging starts with space.
 */
export function WeekCard({ task, mechanic, liftName, dragging = false, courtesyCar, className, onKeyDown, ...rest }: WeekCardProps) {
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
        <span className={styles.time}>{timeRange(task.date, task.time, task.endAt)}</span>
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
        {task.mfk && (
          <span className={styles.mfk} title={task.mfkAppointment ? `MFK ${timeSeenFrom(task.date, task.mfkAppointment)}` : 'MFK, Termin offen'}>
            MFK{task.mfkAppointment ? ` ${timeSeenFrom(task.date, task.mfkAppointment)}` : ''}
          </span>
        )}
        {courtesyCar && (
          <span className={styles.courtesyCar} title={`Ersatzwagen: ${courtesyCar}`}>
            <CarFront aria-label="Ersatzwagen" /> {courtesyCar}
          </span>
        )}
      </div>
      <span className="visually-hidden">Status: {TASK_STATUS[task.status]}</span>
    </div>
  )
}
