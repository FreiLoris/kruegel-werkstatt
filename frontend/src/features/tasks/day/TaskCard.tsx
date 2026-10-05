import { ClipboardCheck, Clock, Hourglass, Printer } from 'lucide-react'
import type { HTMLAttributes, Ref } from 'react'
import { useNavigate } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { formatTime } from '../../../lib/format'
import type { Employee } from '../../employees/employeeApi'
import { NameBadge } from '../../employees/NameBadge'
import type { Task } from '../taskApi'
import { TaskStatusBadge } from '../TaskStatusBadge'
import { statusAccentClass } from '../taskStatusStyle'
import { timeSeenFrom } from '../taskTime'
import { workSummary } from '../workSummary'
import styles from './TaskCard.module.css'

interface TaskCardProps extends HTMLAttributes<HTMLDivElement> {
  task: Task
  mechanic: Employee | undefined
  serviceItemNames: ReadonlyMap<string, string>
  /** the card that is being dragged (shown under the pointer) */
  dragging?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * One task in the day view: time, status, customer, vehicle, mechanic (UI review: was missing)
 * and all work in readable contrast. Click or Enter opens the task; the rest of the props make it
 * draggable (keyboard: space picks it up).
 */
export function TaskCard({ task, mechanic, serviceItemNames, dragging = false, className, onKeyDown, ...rest }: TaskCardProps) {
  const navigate = useNavigate()
  const work = workSummary(task, serviceItemNames)
  const open = () => navigate(`/tasks/${task.id}`)

  return (
    <div
      className={[styles.card, statusAccentClass(task.status), dragging && styles.dragging, className].filter(Boolean).join(' ')}
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
        <TaskStatusBadge status={task.status} />
      </div>
      <p className={styles.customer}>{task.customer.displayName}</p>
      <p className={styles.vehicle}>
        {task.vehicle ? (
          <>
            {task.vehicle.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
            <span>{task.vehicle.description}</span>
          </>
        ) : (
          <span className="muted">Fahrzeug offen</span>
        )}
      </p>
      {work && <p className={styles.work}>{work}</p>}
      <div className={styles.bottom}>
        {mechanic ? <NameBadge name={mechanic.name} color={mechanic.color} /> : <span className="muted">Mechaniker offen</span>}
        <span className={styles.flags}>
          {task.waitingCustomer && (
            <span className={styles.flag} title="Wartekunde – Kunde wartet vor Ort">
              <Hourglass aria-hidden /> Wartet
            </span>
          )}
          {task.mfk && (
            <span className={styles.flag} title="Fahrzeug geht an die MFK">
              <ClipboardCheck aria-hidden /> MFK{task.mfkAppointment ? ` ${timeSeenFrom(task.date, task.mfkAppointment)}` : ''}
            </span>
          )}
          {task.readyBy && (
            <span className={styles.flag} title="Muss fertig sein bis">
              <Clock aria-hidden /> bis {timeSeenFrom(task.date, task.readyBy)}
            </span>
          )}
        </span>
        <button
          type="button"
          className={styles.print}
          onClick={(e) => {
            // the sheet, not the task behind the card
            e.stopPropagation()
            navigate(`/tasks/${task.id}/sheet`)
          }}
          // Enter/space here open the sheet – they must not pick up the card for keyboard dragging
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Auftragszettel ${task.customer.displayName}`}
          title="Auftragszettel"
        >
          <Printer aria-hidden />
        </button>
      </div>
    </div>
  )
}
