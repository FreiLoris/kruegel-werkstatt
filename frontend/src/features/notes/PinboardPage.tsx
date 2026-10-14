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
import { ClipboardList, ListChecks, Plus, StickyNote } from 'lucide-react'
import { useMemo, useState, type FormEvent, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { DoneFilter } from '../../components/ui/DoneFilter'
import { TextArea, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatTimestamp } from '../../lib/format'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useAllEmployees, type Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { BOARD, useMoveNote, useNotes, useSaveNote, type Note } from './noteApi'
import { NoteDialogById } from './NoteDialog'
import { archiveByMonth, movedNote, NEW_COLUMN, pinboardColumns, type PinboardColumn } from './pinboard'
import styles from './PinboardPage.module.css'
import { NO_APPOINTMENT } from '../tasks/taskTime'

/** Drop on the column under the pointer/finger; between columns the closest one (as on the other boards). */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

/** Stable empty list while loading – a new [] on every render would recompute the columns each time */
const NO_NOTES: Note[] = []

/** The to-dos have their own page since FB-04 – the board shows only notes */
const NO_TODOS: never[] = []

/** What is dragged: a note, once per column it is in – "id|column" */
type Dragged = { id: string; columnId: string }
const dragId = (id: string, columnId: string) => `${id}|${columnId}`
const parseDragId = (value: string): Dragged => {
  const [id, columnId] = value.split('|')
  return { id, columnId }
}

/** Old addresses (views of the pinboard until FB-04) – bookmarks on the tablets keep working */
const MOVED: Record<string, string> = { list: '/todos', shopping: '/shopping' }

/**
 * The pinboard (8e, FB-04): per person what to know – notes only; the to-dos and the shopping list
 * have pages of their own. "Erledigt" shows the archived notes (before: a tab "Archiv"). A note can
 * be opened by address (`note=`), e.g. from a to-do that belongs to it.
 */
export function PinboardPage() {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const notes = useNotes(BOARD)
  const { data: employees } = useAllEmployees()

  const view = params.get('view')
  const done = params.get('done') === '1'
  const openId = params.get('note')

  function change(key: 'done' | 'note', value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  if (view && MOVED[view]) {
    const person = params.get('person')
    return <Navigate to={person ? `${MOVED[view]}?person=${encodeURIComponent(person)}` : MOVED[view]} replace />
  }
  // the former tab "Archiv" is "Erledigt" now
  if (view === 'archive') return <Navigate to="/pinboard?done=1" replace />

  return (
    // the board uses the whole screen width (AppLayout: data-wide)
    <div data-wide={done ? undefined : ''}>
      <div className={styles.header}>
        <h1>Pinnwand</h1>
        <DoneFilter done={done} onChange={(on) => change('done', on ? '1' : null)} openCount={notes.data?.length} />
      </div>

      {done ? (
        <ArchiveView employees={employees ?? []} onOpen={(id) => change('note', id)} />
      ) : (
        <Board notes={notes.data} notesError={notes.error} employees={employees} canEdit={canEdit} onOpen={(id) => change('note', id)} />
      )}

      {openId && <NoteDialogById id={openId} canEdit={canEdit} onClose={() => change('note', null)} />}
    </div>
  )
}

/**
 * The board: "Neu" and one column per person from the employee list (bug #3) with their notes. Drag
 * a note to another person (only that person is swapped – the old board overwrote several people
 * with one). Click a note for the rest.
 */
function Board({
  notes: loadedNotes,
  notesError,
  employees,
  canEdit,
  onOpen,
}: {
  notes: Note[] | undefined
  notesError: Error | null
  employees: Employee[] | undefined
  canEdit: boolean
  onOpen: (id: string) => void
}) {
  const toast = useToast()
  const moveNote = useMoveNote()
  const [dragging, setDragging] = useState<Dragged | null>(null)
  // after dropping: the card stays in its new column until the data itself shows it (no flash back)
  const [droppedNotes, setDroppedNotes] = useState<{ notes: Note[]; basedOn: Note[] } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Enter opens the note – only space picks a card up
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const notes = droppedNotes && droppedNotes.basedOn === loadedNotes ? droppedNotes.notes : (loadedNotes ?? NO_NOTES)
  const columns = useMemo(() => pinboardColumns(notes, NO_TODOS, employees ?? []), [notes, employees])
  const columnTitle = (id: string) => (id === NEW_COLUMN ? 'Neu' : employees?.find((e) => e.id === id)?.name ?? '')

  if (notesError) return <p className="muted">Notizen konnten nicht geladen werden: {notesError.message}</p>
  if (!loadedNotes || !employees) return <p className="muted">Lade Pinnwand …</p>

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    if (!over || !loadedNotes) return
    const dragged = parseDragId(String(active.id))
    const toColumn = String(over.id)
    if (toColumn === dragged.columnId) return
    const note = loadedNotes.find((n) => n.id === dragged.id)!
    const arranged = movedNote(loadedNotes, dragged.id, dragged.columnId, toColumn)
    setDroppedNotes({ notes: arranged, basedOn: loadedNotes })
    moveNote.mutate(
      {
        id: dragged.id,
        fromEmployeeId: dragged.columnId === NEW_COLUMN ? undefined : dragged.columnId,
        toEmployeeId: toColumn === NEW_COLUMN ? undefined : toColumn,
        arranged,
      },
      {
        onError: (error) => {
          setDroppedNotes(null)
          toast.error(`«${note.text.slice(0, 40)}» nicht verschoben: ${reasonOf(error)}`)
        },
      },
    )
  }

  const draggedNote = dragging ? notes.find((n) => n.id === dragging.id) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={dropTarget}
      onDragStart={({ active }) => setDragging(parseDragId(String(active.id)))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Leertaste zum Aufnehmen, Pfeiltasten zu einer anderen Spalte, Leertaste zum Ablegen, Escape zum Abbrechen.',
        },
        announcements: {
          onDragStart: () => 'Notiz aufgenommen.',
          onDragOver: ({ over }) => (over ? `Über ${columnTitle(String(over.id))}.` : ''),
          onDragEnd: ({ over }) => (over ? `Abgelegt bei ${columnTitle(String(over.id))}.` : 'Abgebrochen.'),
          onDragCancel: () => 'Verschieben abgebrochen.',
        },
      }}
    >
      <div className={styles.board} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(14rem, 1fr))` }}>
        {columns.map((column) => (
          <Column key={column.id} column={column} canEdit={canEdit}>
            {column.notes.map((note) => (
              <DraggableCard key={note.id} note={note} column={column} employees={employees} canEdit={canEdit} onOpen={() => onOpen(note.id)} />
            ))}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggedNote && dragging && <NoteCard note={draggedNote} columnId={dragging.columnId} employees={employees} dragging onOpen={() => undefined} />}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ column, canEdit, children }: { column: PinboardColumn; canEdit: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const title = column.employee?.name ?? 'Neu'
  const empty = column.notes.length === 0
  return (
    <section className={styles.column} aria-label={title}>
      {/* name on the color bar, white/dark text – readable (UI review: yellow on yellow) */}
      <h2 className={styles.columnTitle} style={{ borderTopColor: column.employee?.color ?? 'var(--color-border-strong)' }}>
        {column.employee ? <NameBadge name={column.employee.name} color={column.employee.color} /> : 'Neu'}
        <span className="muted" title="Notizen">
          {column.notes.length}
        </span>
      </h2>
      {canEdit && <NewEntry column={column} />}
      <div ref={setNodeRef} className={[styles.drop, isOver && styles.over].filter(Boolean).join(' ')}>
        {children}
        {empty && <p className={styles.empty}>Keine Notizen</p>}
      </div>
    </section>
  )
}

/** "+ Notiz" at the top of a column – for that person, or nobody in "Neu". To-dos are added on their page. */
function NewEntry({ column }: { column: PinboardColumn }) {
  const [open, setOpen] = useState(false)
  if (open) return <NewNote column={column} onDone={() => setOpen(false)} />
  return (
    <div className={styles.addButtons}>
      <Button small variant="ghost" icon={Plus} onClick={() => setOpen(true)}>
        Notiz
      </Button>
    </div>
  )
}

function NewNote({ column, onDone }: { column: PinboardColumn; onDone: () => void }) {
  const save = useSaveNote()
  const toast = useToast()
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    save.mutate(
      { request: { text: text.trim(), assigneeIds: column.employee ? [column.employee.id] : [] } },
      {
        onSuccess: onDone,
        onError: (error) => toast.error(`Notiz nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <form className={styles.newEntry} onSubmit={submit}>
      <TextArea
        label={column.employee ? `Neue Notiz für ${column.employee.name}` : 'Neue Notiz'}
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className={styles.newNoteActions}>
        <Button small onClick={onDone}>
          Abbrechen
        </Button>
        <Button small type="submit" variant="primary" loading={save.isPending} disabled={!text.trim()}>
          Anheften
        </Button>
      </div>
    </form>
  )
}

function DraggableCard({
  note,
  column,
  employees,
  canEdit,
  onOpen,
}: {
  note: Note
  column: PinboardColumn
  employees: Employee[]
  canEdit: boolean
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId(note.id, column.id), disabled: !canEdit })
  return (
    <NoteCard
      ref={setNodeRef}
      note={note}
      columnId={column.id}
      employees={employees}
      onOpen={onOpen}
      style={{ opacity: isDragging ? 0.35 : undefined, cursor: canEdit ? 'grab' : undefined }}
      {...attributes}
      {...listeners}
    />
  )
}

interface NoteCardProps extends HTMLAttributes<HTMLDivElement> {
  note: Note
  columnId: string
  employees: Employee[]
  dragging?: boolean
  onOpen: () => void
  ref?: Ref<HTMLDivElement>
}

/**
 * A note on the board: author on top (UI review: the column name was repeated as the head), the
 * text, the task, how many sub-tasks are done, and the other people it is for. Click/Enter opens it.
 */
function NoteCard({ note, columnId, employees, dragging = false, onOpen, className, onKeyDown, ...rest }: NoteCardProps) {
  const person = (id: string) => employees.find((e) => e.id === id)
  const author = note.createdBy ? person(note.createdBy) : undefined
  const others = note.assigneeIds.filter((id) => id !== columnId)
  return (
    <div
      className={[styles.card, dragging && styles.dragging, className].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
        else onKeyDown?.(e)
      }}
      {...rest}
    >
      <p className={styles.author}>
        <StickyNote aria-hidden /> {author?.name ?? 'Notiz'} · {formatTimestamp(note.createdAt)}
      </p>
      <p className={styles.text}>{note.text}</p>
      <div className={styles.meta}>
        {note.task && (
          <span className={styles.chip}>
            <ClipboardList aria-hidden /> {note.task.customerName}, {note.task.date ? formatDate(note.task.date).slice(0, 6) : NO_APPOINTMENT}
          </span>
        )}
        {note.todoCount > 0 && (
          <span className={[styles.chip, note.todoDoneCount === note.todoCount && styles.allDone].filter(Boolean).join(' ')}>
            <ListChecks aria-hidden /> {note.todoDoneCount}/{note.todoCount}
          </span>
        )}
        {others.map((id) => {
          const p = person(id)
          return p ? <NameBadge key={id} name={p.name} color={p.color} /> : null
        })}
      </div>
    </div>
  )
}

/** The archive: search in text and info, grouped by month; a click opens the note (with "Wieder auf die Pinnwand"). */
function ArchiveView({ employees, onOpen }: { employees: Employee[]; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const q = useDebouncedValue(query.trim())
  const archive = useNotes({ archived: true, q: q || undefined })
  const groups = archiveByMonth(archive.data ?? [])
  const person = (id: string) => employees.find((e) => e.id === id)

  return (
    <section className={styles.archive} aria-label="Archiv">
      <TextField label="In erledigten Notizen suchen" type="search" value={query} placeholder="Text oder Infos …" onChange={(e) => setQuery(e.target.value)} />
      {archive.error ? (
        <p className="muted">Archiv konnte nicht geladen werden: {archive.error.message}</p>
      ) : !archive.data ? (
        <p className="muted">Lade Archiv …</p>
      ) : groups.length === 0 ? (
        <p className="muted">{q ? 'Nichts gefunden.' : 'Noch keine erledigten Notizen.'}</p>
      ) : (
        groups.map((group) => (
          <div key={group.month} className={styles.month}>
            <h2>{group.month}</h2>
            <ul className={styles.archiveList}>
              {group.notes.map((note) => (
                <li key={note.id}>
                  <button type="button" className={styles.archived} onClick={() => onOpen(note.id)}>
                    <span className={styles.archivedText}>{note.text}</span>
                    <span className={styles.archivedMeta}>
                      {note.assigneeIds.map((id) => person(id)?.name).filter(Boolean).join(', ') || 'nicht zugewiesen'}
                      {note.task && ` · ${note.task.customerName}`}
                      {' · archiviert '}
                      {formatTimestamp(note.archivedAt!)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
