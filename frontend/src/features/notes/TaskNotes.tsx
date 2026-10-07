import { Archive, ListChecks, Plus, StickyNote } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { TextArea } from '../../components/ui/Fields'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { formatTimestamp } from '../../lib/format'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { useNotes, useSaveNote, useSetNoteArchived, type Note } from './noteApi'
import styles from './TaskNotes.module.css'

/**
 * Pinboard notes about a task (8c – left open in 6h): what is on the board, who wrote it, who takes
 * care, how many sub-tasks are done – and a new note right here (UI review: no modal in a modal).
 * The whole note (sub-tasks, info) is edited on the pinboard (8d).
 */
export function TaskNotes({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const notes = useNotes({ taskId })
  const { data: everyone } = useAllEmployees()
  const { data: active } = useActiveEmployees()
  const save = useSaveNote()
  const archive = useSetNoteArchived()
  const toast = useToast()
  const confirm = useConfirm()
  const [text, setText] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  const person = (id: string | null) => everyone?.find((e) => e.id === id)
  const people = (active ?? []).filter((e) => e.selectableForTodos)

  function toggle(id: string) {
    setAssigneeIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }

  async function archiveNote(note: Note) {
    const open = note.todoCount - note.todoDoneCount
    const ok = await confirm({
      title: 'Notiz archivieren?',
      text:
        `«${note.text}» verschwindet von der Pinnwand (zurückholen im Archiv).` +
        (open > 0 ? ` ${open === 1 ? 'Die offene Aufgabe wird' : `Die ${open} offenen Aufgaben werden`} dabei abgehakt.` : ''),
      confirmLabel: 'Archivieren',
    })
    if (!ok) return
    archive.mutate(
      { id: note.id, archived: true },
      {
        onSuccess: () => toast.success('Notiz archiviert'),
        onError: (error) => toast.error(reasonOf(error)),
      },
    )
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    save.mutate(
      { request: { text: text.trim(), assigneeIds, taskId } },
      {
        onSuccess: () => {
          setText('')
          setAssigneeIds([])
        },
        onError: (error) => toast.error(`Notiz nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  if (notes.error) return <p className="muted">Notizen konnten nicht geladen werden: {notes.error.message}</p>
  if (!notes.data) return <p className="muted">Lade …</p>

  return (
    <div className={styles.notes}>
      {notes.data.length === 0 ? (
        <p className="muted">Keine Notizen zu diesem Auftrag auf der Pinnwand.</p>
      ) : (
        <ul className={styles.list}>
          {notes.data.map((note) => {
            const author = person(note.createdBy)
            return (
              <li key={note.id} className={styles.note}>
                <p className={styles.text}>
                  <StickyNote aria-hidden className={styles.icon} />
                  {note.text}
                </p>
                {note.info && <p className={styles.info}>{note.info}</p>}
                <div className={styles.meta}>
                  {note.assigneeIds.length === 0 ? (
                    <span className="muted">nicht zugewiesen</span>
                  ) : (
                    note.assigneeIds.map((id) => {
                      const p = person(id)
                      return p ? <NameBadge key={id} name={p.name} color={p.color} /> : null
                    })
                  )}
                  {note.todoCount > 0 && (
                    <span className={styles.todos} title="Aufgaben erledigt">
                      <ListChecks aria-hidden /> {note.todoDoneCount}/{note.todoCount}
                    </span>
                  )}
                  <span className="muted">
                    {author ? `${author.name}, ` : ''}
                    {formatTimestamp(note.createdAt)}
                  </span>
                  {canEdit && (
                    <Button
                      small
                      variant="ghost"
                      icon={Archive}
                      className={styles.archive}
                      loading={archive.isPending}
                      onClick={() => void archiveNote(note)}
                    >
                      Archivieren
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {canEdit && (
        <form className={styles.form} onSubmit={add}>
          <TextArea label="Neue Notiz zum Auftrag" rows={2} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
          <div className={styles.people} role="group" aria-label="Für wen">
            <span className={styles.peopleLabel}>Für</span>
            {people.map((p) => (
              <Button
                key={p.id}
                small
                type="button"
                variant={assigneeIds.includes(p.id) ? 'primary' : 'secondary'}
                aria-pressed={assigneeIds.includes(p.id)}
                onClick={() => toggle(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <Button type="submit" icon={Plus} loading={save.isPending} disabled={!text.trim()}>
            An die Pinnwand
          </Button>
        </form>
      )}
    </div>
  )
}
