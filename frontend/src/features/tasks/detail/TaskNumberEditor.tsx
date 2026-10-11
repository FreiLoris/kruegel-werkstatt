import { Check, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../api/errors'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/Fields'
import { useToast } from '../../../components/ui/toastContext'
import { useAssignTaskNumber, type AnyTask } from '../taskApi'
import styles from './TaskNumberEditor.module.css'

/**
 * The task number – assigned by the app when the task is created (12d; older tasks may carry a
 * SwissGarage number). Shown as text; "ändern" corrects it right here, it cannot be removed.
 */
export function TaskNumberEditor({ task, canEdit }: { task: AnyTask; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.taskNumber ?? '')
  const assign = useAssignTaskNumber()
  const toast = useToast()

  const error = assign.error instanceof ApiError ? (assign.error.messageForField('taskNumber') ?? assign.error.message) : undefined

  function submit(event: FormEvent) {
    event.preventDefault()
    assign.mutate(
      { id: task.id, taskNumber: value.trim() },
      {
        onSuccess: (saved) => {
          setEditing(false)
          toast.success(`Auftragsnummer ${saved.taskNumber} gespeichert`)
        },
      },
    )
  }

  if (!editing) {
    return (
      <div className={styles.row}>
        {task.taskNumber ? <strong className={styles.number}>{task.taskNumber}</strong> : <span className="muted">noch keine</span>}
        {canEdit && (
          <Button
            small
            variant="ghost"
            icon={Pencil}
            onClick={() => {
              setValue(task.taskNumber ?? '')
              assign.reset()
              setEditing(true)
            }}
          >
            {task.taskNumber ? 'ändern' : 'eintragen'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <form className={styles.row} onSubmit={submit}>
      <TextField
        label="Auftragsnummer"
        hint="Wird automatisch vergeben – nur zum Korrigieren"
        required
        maxLength={30}
        autoComplete="off"
        // a field that appears after a click should take the typing right away
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          if (assign.error) assign.reset()
        }}
        error={error}
      />
      <div className={styles.buttons}>
        <Button variant="primary" type="submit" icon={Check} loading={assign.isPending}>
          Speichern
        </Button>
        <Button onClick={() => setEditing(false)}>Abbrechen</Button>
      </div>
    </form>
  )
}
