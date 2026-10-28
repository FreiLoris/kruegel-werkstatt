import { useDraggable } from '@dnd-kit/core'
import { CornerDownRight } from 'lucide-react'
import { Link } from 'react-router'
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

/** Hold and drag onto a lift (FB-14) – a tap still opens the task */
function DraggableItem({ task, dimmed }: { task: Task; dimmed: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id })
  return (
    <div ref={setNodeRef} className={styles.draggable} style={{ opacity: dimmed ? 0.35 : undefined }} {...attributes} {...listeners}>
      <CarriedOverItem task={task} title="Nicht fertig geworden – auf einen Lift ziehen oder öffnen" />
    </div>
  )
}

/**
 * One carried-over task – also on its own: the TV's "Ohne Lift" puts each one in its list, so that
 * "+ n weitere" counts the tasks, not the block (one item of 40 tasks said "+ 1 weitere")
 */
export function CarriedOverItem({
  task,
  onOpen,
  title = 'Nicht fertig geworden – öffnen, um neu einzuplanen',
}: {
  task: Task
  onOpen?: () => void
  title?: string
}) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className={styles.item}
      title={title}
      onClick={
        onOpen &&
        ((e) => {
          e.preventDefault()
          onOpen()
        })
      }
    >
      <CornerDownRight aria-hidden className={styles.icon} />
      <span className={styles.text}>
        <span className="visually-hidden">Übertrag:</span>
        <strong>{task.customer.displayName}</strong>
        {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
        <span className={styles.since}>{carriedLabel(task)}</span>
      </span>
    </Link>
  )
}
