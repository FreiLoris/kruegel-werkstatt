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
import { Archive, ClipboardList, ListChecks, Plus, StickyNote } from 'lucide-react'
import { useMemo, useState, type FormEvent, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
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

/** Drop on the column under the pointer/finger; between columns the closest one (as on the other boards). */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

/** Stable empty list while loading – a new [] on every render would recompute the columns each time */
const NO_NOTES: Note[] = []

/** A card is draggable once per column it is in: "note|column" */
const dragId = (noteId: string, columnId: string) => `${noteId}|${columnId}`

/**
 * The pinboard (8d): "Neu" and one column per person from the employee list (bug #3), drag a note
 * to another person (only that person is swapped – the old board overwrote several people with
 * one), click a note for everything else. The archive with search, grouped by month.
 */
export function PinboardPage() {
  const canEdit = useCanEdit()
  const toast = useToast()
  const board = useNotes(BOARD)
  const { data: employees } = useAllEmployees()
  const move = useMoveNote()
  const [openId, setOpenId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [dragging, setDragging] = useState<{ noteId: string; columnId: string } | null>(null)
  // after dropping: the card stays in its new column until the notes themselves show it (no flash back)
  const [dropped, setDropped] = useState<{ notes: Note[]; basedOn: Note[] } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Enter opens the note – only space picks a card up
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const notes = dropped && dropped.basedOn === board.data ? dropped.notes : (board.data ?? NO_NOTES)
  const columns = useMemo(() => pinboardColumns(notes, employees ?? []), [notes, employees])
  const columnTitle = (id: string) => (id === NEW_COLUMN ? 'Neu' : employees?.find((e) => e.id === id)?.name ?? '')

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    if (!over || !board.data) return
    const [noteId, fromColumn] = String(active.id).split('|')
    const toColumn = String(over.id)
    if (toColumn === fromColumn) return
    const note = board.data.find((n) => n.id === noteId)!
    const arranged = movedNote(board.data, noteId, fromColumn, toColumn)
    setDropped({ notes: arranged, basedOn: board.data })
    move.mutate(
      {
        id: noteId,
        fromEmployeeId: fromColumn === NEW_COLUMN ? undefined : fromColumn,
        toEmployeeId: toColumn === NEW_COLUMN ? undefined : toColumn,
        arranged,
      },
      {
        onError: (error) => {
          setDropped(null)
          toast.error(`«${note.text.slice(0, 40)}» nicht verschoben: ${reasonOf(error)}`)
        },
      },
    )
  }

  const draggedNote = dragging ? notes.find((n) => n.id === dragging.noteId) : undefined

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1>Pinnwand</h1>
          <p className="muted">
            {showArchive ? 'Archiv – zurückholen mit «Wieder auf die Pinnwand»' : board.data ? `${board.data.length} Notizen` : '…'}
          </p>
        </div>
        <Button icon={Archive} variant={showArchive ? 'primary' : 'secondary'} aria-pressed={showArchive} onClick={() => setShowArchive(!showArchive)}>
          Archiv
        </Button>
      </div>

      {showArchive ? (
        <ArchiveView employees={employees ?? []} onOpen={setOpenId} />
      ) : board.error ? (
        <p className="muted">Notizen konnten nicht geladen werden: {board.error.message}</p>
      ) : !board.data || !employees ? (
        <p className="muted">Lade Pinnwand …</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={dropTarget}
          onDragStart={({ active }) => {
            const [noteId, columnId] = String(active.id).split('|')
            setDragging({ noteId, columnId })
          }}
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
          <div className={styles.board} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(13rem, 1fr))` }}>
            {columns.map((column) => (
              <Column key={column.id} column={column} canEdit={canEdit}>
                {column.notes.map((note) => (
                  <DraggableCard
                    key={note.id}
                    note={note}
                    column={column}
                    employees={employees}
                    canEdit={canEdit}
                    onOpen={() => setOpenId(note.id)}
                  />
                ))}
              </Column>
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {draggedNote && dragging && (
              <NoteCard note={draggedNote} columnId={dragging.columnId} employees={employees} dragging onOpen={() => undefined} />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {openId && <NoteDialogById id={openId} canEdit={canEdit} onClose={() => setOpenId(null)} />}
    </>
  )
}

function Column({ column, canEdit, children }: { column: PinboardColumn; canEdit: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const title = column.employee?.name ?? 'Neu'
  return (
    <section className={styles.column} aria-label={title}>
      {/* name on the color bar, white/dark text – readable (UI review: yellow on yellow) */}
      <h2 className={styles.columnTitle} style={{ borderTopColor: column.employee?.color ?? 'var(--color-border-strong)' }}>
        {column.employee ? <NameBadge name={column.employee.name} color={column.employee.color} /> : 'Neu'}
        <span className="muted">{column.notes.length}</span>
      </h2>
      {canEdit && <NewNote column={column} />}
      <div ref={setNodeRef} className={[styles.drop, isOver && styles.over].filter(Boolean).join(' ')}>
        {children}
        {column.notes.length === 0 && <p className={styles.empty}>Keine Notizen</p>}
      </div>
    </section>
  )
}

/** "+ Notiz" at the top of a column – for that person, or nobody in "Neu" */
function NewNote({ column }: { column: PinboardColumn }) {
  const save = useSaveNote()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    save.mutate(
      { request: { text: text.trim(), assigneeIds: column.employee ? [column.employee.id] : [] } },
      {
        onSuccess: () => {
          setText('')
          setOpen(false)
        },
        onError: (error) => toast.error(`Notiz nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  if (!open) {
    return (
      <Button small variant="ghost" icon={Plus} className={styles.add} onClick={() => setOpen(true)}>
        Notiz
      </Button>
    )
  }
  return (
    <form className={styles.newNote} onSubmit={submit}>
      <TextArea
        label={column.employee ? `Neue Notiz für ${column.employee.name}` : 'Neue Notiz'}
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className={styles.newNoteActions}>
        <Button small onClick={() => setOpen(false)}>
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
            <ClipboardList aria-hidden /> {note.task.customerName}, {formatDate(note.task.date).slice(0, 6)}
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
      <TextField label="Im Archiv suchen" type="search" value={query} placeholder="Text oder Infos …" onChange={(e) => setQuery(e.target.value)} />
      {archive.error ? (
        <p className="muted">Archiv konnte nicht geladen werden: {archive.error.message}</p>
      ) : !archive.data ? (
        <p className="muted">Lade Archiv …</p>
      ) : groups.length === 0 ? (
        <p className="muted">{q ? 'Nichts gefunden.' : 'Das Archiv ist leer.'}</p>
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
