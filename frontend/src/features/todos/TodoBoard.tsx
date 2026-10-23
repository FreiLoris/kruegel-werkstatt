import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { GripVertical, ListTodo } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { reasonOf } from '../../api/errors'
import { useToast } from '../../components/ui/toastContext'
import type { Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { useReassignTodo, type Todo } from './todoApi'
import { assigneeAfterDrop, movedTodo, NOBODY_COLUMN, todoColumns, type TodoColumn } from './todoGroups'
import { TodoItem } from './TodoItem'
import styles from './TodoBoard.module.css'

/** Drop on the column under the pointer/finger; between columns the closest one (as on the pinboard). */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

/** "id|column" – the column it is dragged from */
const dragId = (id: string, columnId: string) => `${id}|${columnId}`
const parseDragId = (value: string) => {
  const [id, columnId] = value.split('|')
  return { id, columnId }
}

/**
 * Everyone's open to-dos in columns, one per person (FB-04). Dragged to another column = someone
 * else takes care of it – one move instead of "Bearbeiten" and choosing the person (feedback Loris).
 * Dragged by the grip, so checkbox and buttons stay easy to hit; on a tablet hold it briefly.
 */
export function TodoBoard({ todos: loaded, people, canEdit }: { todos: Todo[]; people: Employee[]; canEdit: boolean }) {
  const toast = useToast()
  const reassign = useReassignTodo()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // after dropping: the to-do stays in its new column until the data itself shows it (no flash back)
  const [dropped, setDropped] = useState<{ todos: Todo[]; basedOn: Todo[] } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const todos = dropped && dropped.basedOn === loaded ? dropped.todos : loaded
  const columns = useMemo(() => todoColumns(todos, people), [todos, people])
  const columnTitle = (id: string) => (id === NOBODY_COLUMN ? 'nicht zugewiesen' : (people.find((p) => p.id === id)?.name ?? ''))

  function onDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null)
    if (!over) return
    const { id } = parseDragId(String(active.id))
    const toColumn = String(over.id)
    // done or deleted on another device while dragging
    const todo = loaded.find((t) => t.id === id)
    if (!todo) return
    const assigneeId = assigneeAfterDrop(todo, toColumn)
    if (assigneeId === undefined) return
    const arranged = movedTodo(loaded, id, toColumn)
    setDropped({ todos: arranged, basedOn: loaded })
    reassign.mutate(
      { id, assigneeId, arranged },
      {
        onError: (error) => {
          setDropped(null)
          toast.error(`«${todo.text.slice(0, 40)}» nicht verschoben: ${reasonOf(error)}`)
        },
      },
    )
  }

  const dragged = draggingId ? todos.find((t) => t.id === draggingId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropTarget}
      onDragStart={({ active }) => setDraggingId(parseDragId(String(active.id)).id)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Leertaste zum Aufnehmen, Pfeiltasten zu einer anderen Spalte, Leertaste zum Ablegen, Escape zum Abbrechen.',
        },
        announcements: {
          onDragStart: () => 'To-do aufgenommen.',
          onDragOver: ({ over }) => (over ? `Über ${columnTitle(String(over.id))}.` : ''),
          onDragEnd: ({ over }) => (over ? `Abgelegt bei ${columnTitle(String(over.id))}.` : 'Abgebrochen.'),
          onDragCancel: () => 'Verschieben abgebrochen.',
        },
      }}
    >
      <div className={styles.board} style={{ '--columns': columns.length } as CSSProperties}>
        {columns.map((column) => (
          <Column key={column.id} column={column}>
            {column.todos.map((todo) => (
              <DraggableTodo key={todo.id} todo={todo} column={column} canEdit={canEdit} />
            ))}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragged && (
          <div className={styles.overlay}>
            <ListTodo aria-hidden /> {dragged.text}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ column, children }: { column: TodoColumn; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const title = column.employee?.name ?? 'Nicht zugewiesen'
  return (
    <section className={styles.column} aria-label={title}>
      <h2 className={styles.columnTitle} style={{ borderTopColor: column.employee?.color ?? 'var(--color-border-strong)' }}>
        {column.employee ? <NameBadge name={column.employee.name} color={column.employee.color} /> : title}
        <span className="muted" title="To-dos">
          {column.todos.length}
        </span>
      </h2>
      <ul ref={setNodeRef} className={[styles.drop, isOver && styles.over].filter(Boolean).join(' ')}>
        {children}
        {column.todos.length === 0 && <li className={styles.empty}>Nichts offen</li>}
      </ul>
    </section>
  )
}

function DraggableTodo({ todo, column, canEdit }: { todo: Todo; column: TodoColumn; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId(todo.id, column.id), disabled: !canEdit })
  return (
    <TodoItem
      ref={setNodeRef}
      todo={todo}
      canEdit={canEdit}
      showTask
     
      // in the first column: the name of someone who left; nothing for "not assigned" (the title says it)
      showAssignee={column.employee === null && todo.assigneeId !== null}
      style={{ opacity: isDragging ? 0.35 : undefined }}
      dragHandle={
        canEdit ? (
          <button type="button" className={styles.grip} aria-label={`«${todo.text}» verschieben`} {...attributes} {...listeners}>
            <GripVertical aria-hidden />
          </button>
        ) : (
          <span />
        )
      }
    />
  )
}
