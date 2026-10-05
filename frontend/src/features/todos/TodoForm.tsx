import { Plus, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { Checkbox, Select, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { useSaveTodo, type Todo } from './todoApi'
import styles from './TodoForm.module.css'

interface TodoFormProps {
  /** editing this to-do; empty = a new one */
  todo?: Todo
  /** new to-do: for this task */
  taskId?: string
  /** new to-do: start values from the current filter (person, shopping list tab) */
  defaults?: { assigneeId?: string; shopping?: boolean }
  /** show the "Einkaufsliste" tick (not needed in a task) */
  withShopping?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * New or changed to-do: text, who, until when (and shopping list). A person who is not selectable
 * any more stays in the list while it is on the to-do – the server accepts it unchanged.
 */
export function TodoForm({ todo, taskId, defaults, withShopping = false, onSaved, onCancel }: TodoFormProps) {
  const save = useSaveTodo()
  const toast = useToast()
  const { data: active } = useActiveEmployees()
  const { data: everyone } = useAllEmployees()
  const initial = {
    text: todo?.text ?? '',
    assigneeId: todo?.assigneeId ?? defaults?.assigneeId ?? '',
    dueDate: todo?.dueDate ?? '',
    shopping: todo?.shopping ?? defaults?.shopping ?? false,
  }
  const [draft, setDraft] = useState(initial)
  // the version from when the form was opened (conventions: never the live one)
  const [openedVersion] = useState(todo?.version)

  const current = todo?.assigneeId ? everyone?.find((e) => e.id === todo.assigneeId) : undefined
  const people = (active ?? []).filter((e) => e.selectableForTodos)
  const choices = current && !people.some((p) => p.id === current.id) ? [current, ...people] : people

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.text.trim()) return
    save.mutate(
      {
        id: todo?.id,
        request: {
          text: draft.text.trim(),
          assigneeId: draft.assigneeId || undefined,
          dueDate: draft.dueDate || undefined,
          shopping: draft.shopping,
          taskId: todo ? (todo.task?.id ?? undefined) : taskId,
          version: openedVersion,
        },
      },
      {
        onSuccess: () => {
          if (!todo) setDraft({ ...initial, text: '', dueDate: '' })
          onSaved?.()
        },
        onError: (error) => toast.error(`To-do nicht gespeichert: ${reasonOf(error)}`),
      },
    )
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
      {withShopping && (
        <Checkbox label="Einkaufsliste" checked={draft.shopping} onChange={(e) => setDraft({ ...draft, shopping: e.target.checked })} />
      )}
      <div className={styles.actions}>
        {onCancel && (
          <Button onClick={onCancel} disabled={save.isPending}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" variant={todo ? 'primary' : 'secondary'} icon={todo ? Save : Plus} loading={save.isPending} disabled={!draft.text.trim()}>
          {todo ? 'Speichern' : 'Hinzufügen'}
        </Button>
      </div>
    </form>
  )
}
