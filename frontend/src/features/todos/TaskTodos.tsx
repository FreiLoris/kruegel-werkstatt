import { Plus, Trash2, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatTimestamp, todayIso } from '../../lib/format'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { useDeleteTodo, useSaveTodo, useSetTodoDone, useTodos, type Todo } from './todoApi'
import { dueState } from './todoDue'
import styles from './TaskTodos.module.css'

const EMPTY = { text: '', assigneeId: '', dueDate: '' }

/**
 * To-dos of a task (8a – left open in 6h): tick off with the checkbox only (F5: the old dashboard
 * ticked off on any click), done ones stay visible with "Rückgängig", add one right here.
 */
export function TaskTodos({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const open = useTodos({ taskId })
  const done = useTodos({ taskId, done: true })
  const { data: everyone } = useAllEmployees()
  const { data: active } = useActiveEmployees()
  const save = useSaveTodo()
  const setDone = useSetTodoDone()
  const remove = useDeleteTodo()
  const toast = useToast()
  const [draft, setDraft] = useState(EMPTY)
  const today = todayIso()

  const people = (active ?? []).filter((e) => e.selectableForTodos)
  const person = (id: string | null) => everyone?.find((e) => e.id === id)

  function add(e: FormEvent) {
    e.preventDefault()
    if (!draft.text.trim()) return
    save.mutate(
      { request: { text: draft.text.trim(), assigneeId: draft.assigneeId || undefined, dueDate: draft.dueDate || undefined, taskId } },
      {
        onSuccess: () => setDraft(EMPTY),
        onError: (error) => toast.error(`To-do nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  function tick(todo: Todo, isDone: boolean) {
    setDone.mutate({ id: todo.id, done: isDone }, { onError: (error) => toast.error(reasonOf(error)) })
  }

  if (open.error) return <p className="muted">To-dos konnten nicht geladen werden: {open.error.message}</p>
  if (!open.data) return <p className="muted">Lade …</p>

  const doneOnes = done.data ?? []

  return (
    <div className={styles.todos}>
      {open.data.length === 0 && doneOnes.length === 0 && <p className="muted">Keine To-dos zu diesem Auftrag.</p>}
      <ul className={styles.list}>
        {open.data.map((todo) => {
          const assignee = person(todo.assigneeId)
          const due = dueState(todo.dueDate, today)
          return (
            <li key={todo.id} className={styles.item}>
              <input
                type="checkbox"
                className={styles.check}
                checked={false}
                disabled={!canEdit || setDone.isPending}
                onChange={() => tick(todo, true)}
                aria-label={`«${todo.text}» erledigt`}
              />
              <span className={styles.text}>{todo.text}</span>
              <span className={styles.meta}>
                {assignee && <NameBadge name={assignee.name} color={assignee.color} />}
                {todo.dueDate && (
                  <span className={[styles.due, styles[due]].join(' ')}>
                    {due === 'overdue' ? 'überfällig ' : due === 'today' ? 'heute ' : 'bis '}
                    {due === 'today' ? '' : formatDate(todo.dueDate)}
                  </span>
                )}
                {canEdit && (
                  <Button
                    small
                    variant="ghost"
                    icon={Trash2}
                    aria-label={`«${todo.text}» löschen`}
                    onClick={() => remove.mutate(todo.id, { onError: (error) => toast.error(reasonOf(error)) })}
                  />
                )}
              </span>
            </li>
          )
        })}
        {doneOnes.map((todo) => (
          <li key={todo.id} className={[styles.item, styles.done].join(' ')}>
            <input type="checkbox" className={styles.check} checked disabled aria-label={`«${todo.text}» ist erledigt`} />
            <span className={styles.text}>{todo.text}</span>
            <span className={styles.meta}>
              <span className="muted">
                {person(todo.doneBy)?.name ?? 'erledigt'}
                {todo.doneAt && `, ${formatTimestamp(todo.doneAt)}`}
              </span>
              {canEdit && (
                <Button small variant="ghost" icon={Undo2} onClick={() => tick(todo, false)} disabled={setDone.isPending}>
                  Rückgängig
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {canEdit && (
        <form className={styles.form} onSubmit={add}>
          <TextField label="Neues To-do" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          <Select label="Wer" value={draft.assigneeId} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>
            <option value="">noch offen</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <TextField label="Bis" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
          <Button type="submit" icon={Plus} loading={save.isPending} disabled={!draft.text.trim()}>
            Hinzufügen
          </Button>
        </form>
      )}
    </div>
  )
}
