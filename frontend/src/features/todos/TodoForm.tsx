import { Plus, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { useSingleFlight } from '../../lib/useSingleFlight'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { useAddNoteTodo } from '../notes/noteApi'
import { useSaveTodo, type Todo } from './todoApi'
import styles from './TodoForm.module.css'

interface TodoFormProps {
  /** editing this to-do; empty = a new one */
  todo?: Todo
  /** new to-do: for this task */
  taskId?: string
  /** new to-do: a sub-task of this note (pinboard) */
  noteId?: string
  /** new to-do: start values from the current filter (person) */
  defaults?: { assigneeId?: string }
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * New or changed to-do: text, who, until when. The shopping list has its own entry (FB-20). A person who is not selectable any more stays in the list while it is on the to-do – the
 * server accepts it unchanged.
 */
export function TodoForm({ todo, taskId, noteId, defaults, onSaved, onCancel }: TodoFormProps) {
  const saveTodo = useSaveTodo()
  const addToNote = useAddNoteTodo()
  const pending = saveTodo.isPending || addToNote.isPending
  const toast = useToast()
  const { data: active } = useActiveEmployees()
  const { data: everyone } = useAllEmployees()
  const initial = {
    text: todo?.text ?? '',
    assigneeId: todo?.assigneeId ?? defaults?.assigneeId ?? '',
    dueDate: todo?.dueDate ?? '',
  }
  const [draft, setDraft] = useState(initial)
  // the version from when the form was opened (conventions: never the live one)
  const [openedVersion] = useState(todo?.version)
  const once = useSingleFlight()

  const current = todo?.assigneeId ? everyone?.find((e) => e.id === todo.assigneeId) : undefined
  const people = (active ?? []).filter((e) => e.selectableForTodos)
  const choices = current && !people.some((p) => p.id === current.id) ? [current, ...people] : people

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.text.trim()) return
    const request = {
      text: draft.text.trim(),
      assigneeId: draft.assigneeId || undefined,
      dueDate: draft.dueDate || undefined,
      taskId: todo ? (todo.task?.id ?? undefined) : taskId,
      version: openedVersion,
    }
    const callbacks = {
      onSuccess: () => {
        if (!todo) setDraft({ ...initial, text: '', dueDate: '' })
        onSaved?.()
      },
      onError: (error: Error) => toast.error(`To-do nicht gespeichert: ${reasonOf(error)}`),
    }
    once((done) => {
      if (!todo && noteId) addToNote.mutate({ noteId, request }, { ...callbacks, onSettled: done })
      else saveTodo.mutate({ id: todo?.id, request }, { ...callbacks, onSettled: done })
    })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.text}>
        <TextField
          label={todo ? 'To-do' : 'Neues To-do'}
          value={draft.text}
          maxLength={500}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
      </div>
      <Select label="Wer" value={draft.assigneeId} onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}>
        <option value="">nicht zugewiesen</option>
        {choices.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <TextField label="Bis" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
      <div className={styles.actions}>
        {onCancel && (
          <Button onClick={onCancel} disabled={pending}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" variant={todo ? 'primary' : 'secondary'} icon={todo ? Save : Plus} loading={pending} disabled={!draft.text.trim()}>
          {todo ? 'Speichern' : 'Hinzufügen'}
        </Button>
      </div>
    </form>
  )
}
