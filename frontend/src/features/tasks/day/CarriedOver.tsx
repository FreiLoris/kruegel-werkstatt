import { useDraggable } from '@dnd-kit/core'
import { CornerDownRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { carriedLabel } from '../carriedOver'
import type { Task } from '../taskApi'
import styles from './CarriedOver.module.css'

/**
 * "Übertrag" (FB-14): tasks not finished on their day – in "Ohne Lift", without time and duration,
 * so they take no lift and overlap nothing. A tap opens the task; planned again it leaves the list.
 * In the day view they can be dragged onto a lift and a time ({@code draggable}, inside its DndContext).
 */
export function CarriedOver({
  tasks,
  label = 'Übertrag – nicht fertig',
  onOpen,
  draggable = false,
  draggingId,
}: {
  tasks: Task[]
  label?: string
  /** instead of opening the task (the wizard's week opens the day, FB-13) */
  onOpen?: () => void
  /** day view: drag one onto a lift – only inside a DndContext */
  draggable?: boolean
  /** the one being dragged – shown faint in the list */
  draggingId?: string
}) {
  if (tasks.length === 0) return null
  return (
    <ul className={styles.list} aria-label={label}>
      {tasks.map((task) => (
        <li key={task.id}>
          {draggable ? <DraggableItem task={task} dimmed={draggingId === task.id} /> : <CarriedOverItem task={task} onOpen={onOpen} />}
        </li>
      ))}
    </ul>
  )
}

/**
 * Hold and drag onto a lift (FB-14) – a tap or Enter opens the task. One element that is both, like
 * a block (TaskCard): a link inside would be followed natively after a drag (dnd-kit stops the click
 * for React only) and would be a second stop for the keyboard.
 */
function DraggableItem({ task, dimmed }: { task: Task; dimmed: boolean }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id })
  const open = () => navigate(`/tasks/${task.id}`)
  return (
    <div
      ref={setNodeRef}
      className={`${styles.item} ${styles.draggable}`}
      title="Nicht fertig geworden – auf einen Lift ziehen oder öffnen"
      style={{ opacity: dimmed ? 0.35 : undefined }}
      {...attributes}
      {...listeners}
      onClick={open}
      // Enter opens it – only space picks it up, like a block
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
        else listeners?.onKeyDown?.(e)
      }}
    >
      <ItemText task={task} />
    </div>
  )
}

/**
 * One carried-over task – also on its own: the TV's "Ohne Lift" puts each one in its list, so that
 * "+ n weitere" counts the tasks, not the block (one item of 40 tasks said "+ 1 weitere")
 */
export function CarriedOverItem({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className={styles.item}
      title="Nicht fertig geworden – öffnen, um neu einzuplanen"
      onClick={
        onOpen &&
        ((e) => {
          e.preventDefault()
          onOpen()
        })
      }
    >
      <ItemText task={task} />
    </Link>
  )
}

/** Customer, plate and since when – the same in the link and in the draggable item */
function ItemText({ task }: { task: Task }) {
  return (
    <>
      <CornerDownRight aria-hidden className={styles.icon} />
      <span className={styles.text}>
        <span className="visually-hidden">Übertrag:</span>
        <strong>{task.customer.displayName}</strong>
        {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
        <span className={styles.since}>{carriedLabel(task)}</span>
      </span>
    </>
  )
}
