import { Archive, ArchiveRestore, Check, ClipboardList, Save, Search, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { TextArea, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatTime, formatTimestamp } from '../../lib/format'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useActiveEmployees, useAllEmployees } from '../employees/employeeApi'
import { useTaskSearch } from '../tasks/taskApi'
import { useTodos } from '../todos/todoApi'
import { TodoForm } from '../todos/TodoForm'
import { TodoItem } from '../todos/TodoItem'
import { useDeleteNote, useNote, useSaveNote, useSetNoteArchived, type Note } from './noteApi'
import styles from './NoteDialog.module.css'

/** The task link while editing: what is shown, what is sent */
type TaskLink = { id: string; label: string } | null

const taskLabel = (t: { customerName: string; date: string; time: string; taskNumber: string | null }) =>
  `${t.customerName}, ${formatDate(t.date).slice(0, 6)} ${formatTime(t.time)}${t.taskNumber ? ` (${t.taskNumber})` : ''}`

/** Opens a note by ID – from the board or the archive; closes itself when the note is deleted elsewhere. */
export function NoteDialogById({ id, canEdit, onClose }: { id: string; canEdit: boolean; onClose: () => void }) {
  const note = useNote(id)
  const gone = note.error !== null
  useEffect(() => {
    if (gone) onClose()
  }, [gone, onClose])
  if (!note.data) return null
  // the form takes the note as it was when opened (conventions) – a new key only for another note
  return <NoteDialog key={id} note={note.data} canEdit={canEdit} onClose={onClose} />
}

/**
 * One note in full (8d): text and info in fields that grow with the text (UI review: 2 lines),
 * a visible "Gespeichert ✓" (UI review: did "Infos" save?), people, the task it is about, and its
 * sub-tasks – ordinary to-dos. Archive / back on the board, delete.
 */
export function NoteDialog({ note, canEdit, onClose }: { note: Note; canEdit: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveNote()
  const archive = useSetNoteArchived()
  const remove = useDeleteNote()
  const { data: everyone } = useAllEmployees()
  const { data: active } = useActiveEmployees()
  const openTodos = useTodos({ noteId: note.id })
  const doneTodos = useTodos({ noteId: note.id, done: true })

  // the version from when the dialog was opened (conventions: never the live one)
  const [openedVersion, setOpenedVersion] = useState(note.version)
  const [draft, setDraft] = useState({
    text: note.text,
    info: note.info ?? '',
    assigneeIds: note.assigneeIds,
    task: (note.task ? { id: note.task.id, label: taskLabel(note.task) } : null) as TaskLink,
  })
  const [savedState, setSavedState] = useState<'clean' | 'dirty' | 'saved'>('clean')
  const [search, setSearch] = useState('')
  const hits = useTaskSearch(useDebouncedValue(search))

  const person = (id: string) => everyone?.find((e) => e.id === id)
  const people = (active ?? []).filter((e) => e.selectableForTodos || draft.assigneeIds.includes(e.id))
  const archived = note.archivedAt !== null

  function change(next: Partial<typeof draft>) {
    setDraft({ ...draft, ...next })
    setSavedState('dirty')
  }

  function toggle(id: string) {
    change({ assigneeIds: draft.assigneeIds.includes(id) ? draft.assigneeIds.filter((x) => x !== id) : [...draft.assigneeIds, id] })
  }

  function submit() {
    if (!draft.text.trim()) return
    save.mutate(
      {
        id: note.id,
        request: {
          text: draft.text.trim(),
          info: draft.info.trim() || undefined,
          assigneeIds: draft.assigneeIds,
          taskId: draft.task?.id,
          version: openedVersion,
        },
      },
      {
        onSuccess: (saved) => {
          setOpenedVersion(saved.version)
          setSavedState('saved')
        },
        onError: (error) => toast.error(`Notiz nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  async function setArchived(value: boolean) {
    const open = note.todoCount - note.todoDoneCount
    if (value) {
      const ok = await confirm({
        title: 'Notiz archivieren?',
        text: `Sie verschwindet von der Pinnwand.${open > 0 ? ` ${open === 1 ? 'Die offene Aufgabe wird' : `Die ${open} offenen Aufgaben werden`} dabei abgehakt.` : ''}`,
        confirmLabel: 'Archivieren',
      })
      if (!ok) return
    }
    archive.mutate(
      { id: note.id, archived: value },
      {
        onSuccess: () => {
          toast.success(value ? 'Notiz archiviert' : 'Notiz wieder auf der Pinnwand')
          onClose()
        },
        onError: (error) => toast.error(reasonOf(error)),
      },
    )
  }

  async function deleteNote() {
    const ok = await confirm({
      title: 'Notiz löschen?',
      text: 'Sie wird mit ihren Aufgaben endgültig gelöscht. Normalerweise archiviert man sie.',
      confirmLabel: 'Löschen',
      dangerous: true,
    })
    if (!ok) return
    remove.mutate(note.id, {
      onSuccess: () => {
        toast.success('Notiz gelöscht')
        onClose()
      },
      onError: (error) => toast.error(reasonOf(error)),
    })
  }

  const author = note.createdBy ? person(note.createdBy) : undefined
  const todos = [...(openTodos.data ?? []), ...(doneTodos.data ?? [])]

  return (
    <Modal
      open
      onClose={onClose}
      title={archived ? 'Notiz (archiviert)' : 'Notiz'}
      wide
      footer={
        <div className={styles.footer}>
          {canEdit && (
            <>
              <Button variant="ghost" icon={Trash2} onClick={() => void deleteNote()} disabled={remove.isPending}>
                Löschen
              </Button>
              {archived ? (
                <Button icon={ArchiveRestore} onClick={() => void setArchived(false)} loading={archive.isPending}>
                  Wieder auf die Pinnwand
                </Button>
              ) : (
                <Button icon={Archive} onClick={() => void setArchived(true)} loading={archive.isPending}>
                  Archivieren
                </Button>
              )}
            </>
          )}
          <span className={styles.spacer} />
          {savedState === 'saved' && (
            <span className={styles.saved} role="status">
              <Check aria-hidden /> Gespeichert
            </span>
          )}
          <Button onClick={onClose}>Schliessen</Button>
          {canEdit && (
            <Button variant="primary" icon={Save} onClick={submit} loading={save.isPending} disabled={savedState !== 'dirty' || !draft.text.trim()}>
              Speichern
            </Button>
          )}
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.byline}>
          {author ? `${author.name}, ` : ''}
          {formatTimestamp(note.createdAt)}
          {archived && ` · archiviert ${formatTimestamp(note.archivedAt!)}`}
        </p>

        <TextArea
          label="Notiz"
          className={styles.grow}
          rows={3}
          maxLength={2000}
          value={draft.text}
          readOnly={!canEdit}
          onChange={(e) => change({ text: e.target.value })}
          data-autofocus
        />
        <TextArea
          label="Infos"
          className={styles.grow}
          rows={2}
          maxLength={4000}
          value={draft.info}
          readOnly={!canEdit}
          hint="Hintergrund, Telefonnummern, …"
          onChange={(e) => change({ info: e.target.value })}
        />

        <div className={styles.people} role="group" aria-label="Für wen">
          <span className={styles.label}>Für</span>
          {people.map((p) => (
            <Button
              key={p.id}
              small
              variant={draft.assigneeIds.includes(p.id) ? 'primary' : 'secondary'}
              aria-pressed={draft.assigneeIds.includes(p.id)}
              disabled={!canEdit}
              onClick={() => toggle(p.id)}
            >
              <span className={styles.dot} style={{ background: p.color }} aria-hidden />
              {p.name}
            </Button>
          ))}
          {draft.assigneeIds.length === 0 && <span className="muted">nicht zugewiesen</span>}
        </div>

        <div className={styles.task}>
          <span className={styles.label}>Auftrag</span>
          {draft.task ? (
            <>
              <button type="button" className={styles.taskLink} onClick={() => navigate(`/tasks/${draft.task!.id}`)}>
                <ClipboardList aria-hidden /> {draft.task.label}
              </button>
              {canEdit && <Button small variant="ghost" icon={X} aria-label="Verknüpfung entfernen" onClick={() => change({ task: null })} />}
            </>
          ) : canEdit ? (
            <div className={styles.search}>
              <TextField
                label="Auftrag suchen"
                type="search"
                value={search}
                placeholder="Kunde, Kennzeichen, Auftragsnummer …"
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.trim().length >= 2 && (
                <ul className={styles.hits}>
                  {(hits.data?.hits ?? []).slice(0, 6).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={styles.hit}
                        onClick={() => {
                          change({
                            task: { id: t.id, label: taskLabel({ customerName: t.customer.displayName, date: t.date, time: t.time, taskNumber: t.taskNumber }) },
                          })
                          setSearch('')
                        }}
                      >
                        <Search aria-hidden /> {t.customer.displayName}, {formatDate(t.date)} {formatTime(t.time)}
                        {t.vehicle?.licensePlate && ` · ${t.vehicle.licensePlate}`}
                      </button>
                    </li>
                  ))}
                  {hits.data && hits.data.hits.length === 0 && <li className="muted">Kein Auftrag gefunden.</li>}
                </ul>
              )}
            </div>
          ) : (
            <span className="muted">keiner</span>
          )}
        </div>

        <section className={styles.todos} aria-label="Aufgaben">
          <h3>Aufgaben</h3>
          {todos.length === 0 ? (
            <p className="muted">Keine Aufgaben – sie erscheinen auch in den To-do-Listen.</p>
          ) : (
            <ul className={styles.list}>
              {todos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} canEdit={canEdit && !archived} showNote={false} />
              ))}
            </ul>
          )}
          {canEdit && !archived && <TodoForm noteId={note.id} />}
        </section>
      </div>
    </Modal>
  )
}
