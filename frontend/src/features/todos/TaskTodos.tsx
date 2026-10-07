import { useTodos } from './todoApi'
import { TodoForm } from './TodoForm'
import { TodoItem } from './TodoItem'
import styles from './TaskTodos.module.css'

/**
 * To-dos of a task (8a – left open in 6h): tick off with the checkbox only (F5), done ones stay
 * visible with "Rückgängig". Part of the card "Pinnwand & To-dos" (8e).
 */
export function TaskTodos({
  taskId,
  canEdit,
  adding,
  onAdded,
}: {
  taskId: string
  canEdit: boolean
  /** show the form for a new to-do */
  adding: boolean
  onAdded: () => void
}) {
  const open = useTodos({ taskId })
  const done = useTodos({ taskId, done: true })

  if (open.error) return <p className="muted">To-dos konnten nicht geladen werden: {open.error.message}</p>
  if (!open.data) return <p className="muted">Lade …</p>

  const all = [...open.data, ...(done.data ?? [])]
  return (
    <div className={styles.todos}>
      {all.length > 0 && (
        <ul className={styles.list}>
          {all.map((todo) => (
            <TodoItem key={todo.id} todo={todo} canEdit={canEdit} />
          ))}
        </ul>
      )}
      {canEdit && adding && <TodoForm taskId={taskId} onSaved={onAdded} onCancel={onAdded} />}
    </div>
  )
}
