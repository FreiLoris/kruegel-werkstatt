import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState, type ReactNode } from 'react'
import { useToast } from '../../../components/ui/toastContext'
import type { Employee } from '../../employees/employeeApi'
import { useMoveTask, type Task, type tasksBetweenKey } from '../taskApi'
import styles from './DayBoard.module.css'
import { applyArrangement, arrangementOf, columnOf, moveTask, NO_LIFT, type Arrangement, type DayColumn } from './dayColumns'
import { TaskCard } from './TaskCard'

/**
 * Where is the card dropped? Where the pointer/finger is – not where the corners of the dragged
 * card happen to be (a card grabbed at its left edge would otherwise land in the next column).
 * Between the columns the closest one counts.
 */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

interface DayBoardProps {
  columns: DayColumn[]
  tasks: Task[]
  dayKey: ReturnType<typeof tasksBetweenKey>
  employees: Employee[]
  serviceItemNames: ReadonlyMap<string, string>
  canEdit: boolean
}

/**
 * The lift columns of a day with drag & drop – within a column and between columns.
 * Mouse: drag after a few pixels (a click stays a click). Tablet: press and hold briefly, so
 * scrolling still works. Keyboard: space to pick up, arrows, space to drop.
 * The server saves the order of BOTH columns (bug #5).
 */
export function DayBoard({ columns, tasks, dayKey, employees, serviceItemNames, canEdit }: DayBoardProps) {
  const move = useMoveTask(dayKey)
  const toast = useToast()
  const [dragging, setDragging] = useState<{ id: string; arrangement: Arrangement } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const columnIds = new Set(columns.map((column) => column.id))
  const arrangement = dragging?.arrangement ?? arrangementOf(columns)
  const titleOf = (columnId: string) => columns.find((column) => column.id === columnId)?.title ?? ''

  /** over = a card or an (empty) column → target column and index */
  function target(current: Arrangement, overId: string): { column: string; index: number } | null {
    if (columnIds.has(overId)) return { column: overId, index: current[overId].length }
    const column = columnOf(current, overId)
    return column ? { column, index: current[column].indexOf(overId) } : null
  }

  function onDragStart({ active }: DragStartEvent) {
    setDragging({ id: String(active.id), arrangement: arrangementOf(columns) })
  }

  // into another column already while dragging, so the cards there make room
  function onDragOver({ active, over }: DragOverEvent) {
    if (!dragging || !over) return
    const from = columnOf(dragging.arrangement, String(active.id))
    const to = target(dragging.arrangement, String(over.id))
    if (!to || !from || from === to.column) return
    setDragging({ ...dragging, arrangement: moveTask(dragging.arrangement, String(active.id), to.column, to.index) })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = dragging?.arrangement
    setDragging(null)
    if (!current || !over) return
    const id = String(active.id)
    const column = columnOf(current, id)!
    const to = target(current, String(over.id))
    const index = to && to.column === column ? to.index : current[column].indexOf(id)
    const final = moveTask(current, id, column, index)

    const original = arrangementOf(columns)
    const unchanged = columnOf(original, id) === column && original[column].indexOf(id) === index
    if (unchanged) return

    const task = byId.get(id)!
    move.mutate(
      { id, liftId: column === NO_LIFT ? null : column, position: index, arranged: applyArrangement(tasks, final) },
      { onError: (error) => toast.error(`${task.customer.displayName} konnte nicht verschoben werden: ${error.message}`) },
    )
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${byId.get(String(active.id))?.customer.displayName} aufgenommen.`,
    onDragOver: ({ over }) => (over ? `Über ${titleOf(target(arrangement, String(over.id))?.column ?? '')}.` : ''),
    onDragEnd: ({ over }) => (over ? `Abgelegt in ${titleOf(target(arrangement, String(over.id))?.column ?? '')}.` : 'Abgebrochen.'),
    onDragCancel: () => 'Verschieben abgebrochen.',
  }

  const activeTask = dragging ? byId.get(dragging.id) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropTarget}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben, Leertaste zum Ablegen, Escape zum Abbrechen.',
        },
      }}
    >
      <div className={styles.board} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(15rem, 1fr))` }}>
        {columns.map((column) => (
          <Column key={column.id} id={column.id} title={column.title} count={arrangement[column.id].length}>
            <SortableContext items={arrangement[column.id]} strategy={verticalListSortingStrategy}>
              {arrangement[column.id].map((id) => {
                const task = byId.get(id)!
                return (
                  <SortableCard
                    key={id}
                    task={task}
                    mechanic={employees.find((e) => e.id === task.mechanicId)}
                    serviceItemNames={serviceItemNames}
                    disabled={!canEdit}
                  />
                )
              })}
            </SortableContext>
          </Column>
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            mechanic={employees.find((e) => e.id === activeTask.mechanicId)}
            serviceItemNames={serviceItemNames}
            dragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  // the whole column is a drop zone – also when it is empty
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section className={styles.column} aria-label={title}>
      <h2 className={styles.columnTitle}>
        {title} <span className="muted">{count}</span>
      </h2>
      <div ref={setNodeRef} className={[styles.drop, isOver && styles.over].filter(Boolean).join(' ')}>
        {children}
        {count === 0 && <p className={styles.empty}>Keine Termine</p>}
      </div>
    </section>
  )
}

function SortableCard({
  task,
  mechanic,
  serviceItemNames,
  disabled,
}: {
  task: Task
  mechanic: Employee | undefined
  serviceItemNames: ReadonlyMap<string, string>
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled })
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      mechanic={mechanic}
      serviceItemNames={serviceItemNames}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : undefined }}
      className={disabled ? undefined : styles.draggable}
      {...attributes}
      {...listeners}
    />
  )
}
