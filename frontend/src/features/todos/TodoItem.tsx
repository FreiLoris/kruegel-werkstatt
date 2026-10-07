import { ClipboardList, Pencil, ShoppingCart, StickyNote, Trash2, Undo2 } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { useNavigate } from 'react-router'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatTime, formatTimestamp, todayIso } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { useDeleteTodo, useSetTodoDone, type Todo } from './todoApi'
import { dueLabel, dueState } from './todoDue'
import { TodoForm } from './TodoForm'
import styles from './TodoItem.module.css'

interface TodoItemProps {
  todo: Todo
  canEdit: boolean
  /** show the task it is about as a link (not inside the task itself) */
  showTask?: boolean
  /** show the shopping list tick in the edit form */
  withShopping?: boolean
  /** say "Pinnwand" for a sub-task of a note (not inside the note itself) */
  showNote?: boolean
  /** hide the person – in the person's own pinboard column it is clear */
  showAssignee?: boolean
  /** pinboard: a grip to drag the to-do to another column (the checkbox and buttons stay clickable) */
  dragHandle?: ReactNode
  style?: CSSProperties
  ref?: Ref<HTMLLIElement>
}

/**
 * One to-do: ticked off ONLY with the checkbox (F5: the old dashboard ticked off on any click),
 * done ones show who and when with "Rückgängig". Edit in place, delete after asking.
 */
export function TodoItem({
  todo,
  canEdit,
  showTask = false,
  withShopping = false,
  showNote = true,
  showAssignee = true,
  dragHandle,
  style,
  ref,
}: TodoItemProps) {
  const navigate = useNavigate()
  const setDone = useSetTodoDone()
  const remove = useDeleteTodo()
  const confirm = useConfirm()
  const toast = useToast()
  const { data: everyone } = useAllEmployees()
  const [editing, setEditing] = useState(false)
  const person = (id: string | null) => everyone?.find((e) => e.id === id)
  const done = todo.doneAt !== null
  const today = todayIso()

  function tick(isDone: boolean) {
    setDone.mutate({ id: todo.id, done: isDone }, { onError: (error) => toast.error(reasonOf(error)) })
  }

  async function deleteTodo() {
    const ok = await confirm({ title: 'To-do löschen?', text: `«${todo.text}» wird gelöscht.`, confirmLabel: 'Löschen', dangerous: true })
    if (!ok) return
    remove.mutate(todo.id, { onError: (error) => toast.error(`Löschen fehlgeschlagen: ${reasonOf(error)}`) })
  }

  if (editing) {
    return (
      <li className={styles.item}>
        <div className={styles.editor}>
          <TodoForm todo={todo} withShopping={withShopping} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </div>
      </li>
    )
  }

  const assignee = person(todo.assigneeId)
  const due = dueState(todo.dueDate, today)
  return (
    <li ref={ref} style={style} className={[styles.item, dragHandle !== undefined && styles.draggable, done && styles.done].filter(Boolean).join(' ')}>
      {dragHandle}
      <input
        type="checkbox"
        className={styles.check}
        checked={done}
        disabled={!canEdit || done || setDone.isPending}
        onChange={() => tick(true)}
        aria-label={done ? `«${todo.text}» ist erledigt` : `«${todo.text}» erledigt`}
      />
      <span className={styles.text}>
        {todo.shopping && <ShoppingCart aria-label="Einkaufsliste" className={styles.icon} />}
        {todo.text}
      </span>
      <span className={styles.meta}>
        {done ? (
          <span className="muted">
            erledigt{person(todo.doneBy) ? ` von ${person(todo.doneBy)!.name}` : ''}
            {todo.doneAt && `, ${formatTimestamp(todo.doneAt)}`}
          </span>
        ) : (
          <>
            {showAssignee &&
              (assignee ? <NameBadge name={assignee.name} color={assignee.color} /> : <span className="muted">nicht zugewiesen</span>)}
            {todo.dueDate && <span className={[styles.due, styles[due]].join(' ')}>{dueLabel(todo.dueDate, today)}</span>}
          </>
        )}
        {showNote && todo.noteId && (
          <span className={styles.fromNote} title="Aufgabe aus einer Pinnwand-Notiz">
            <StickyNote aria-hidden /> Pinnwand
          </span>
        )}
        {showTask && todo.task && (
          <button type="button" className={styles.task} onClick={() => navigate(`/tasks/${todo.task!.id}`)}>
            <ClipboardList aria-hidden />
            {todo.task.customerName}, {formatDate(todo.task.date).slice(0, 6)} {formatTime(todo.task.time)}
            {todo.task.taskNumber && ` (${todo.task.taskNumber})`}
          </button>
        )}
        {canEdit && (
          <span className={styles.actions}>
            {done ? (
              <Button small variant="ghost" icon={Undo2} onClick={() => tick(false)} disabled={setDone.isPending}>
                Rückgängig
              </Button>
            ) : (
              <>
                <Button small variant="ghost" icon={Pencil} aria-label={`«${todo.text}» bearbeiten`} onClick={() => setEditing(true)} />
                <Button small variant="ghost" icon={Trash2} aria-label={`«${todo.text}» löschen`} onClick={() => void deleteTodo()} />
              </>
            )}
          </span>
        )}
      </span>
    </li>
  )
}
