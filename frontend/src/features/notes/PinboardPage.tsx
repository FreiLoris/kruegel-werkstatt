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
import { Archive, ClipboardList, GripVertical, LayoutGrid, ListChecks, ListTodo, Plus, ShoppingCart, StickyNote } from 'lucide-react'
import { useMemo, useState, type FormEvent, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { useSearchParams } from 'react-router'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { TextArea, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatTimestamp } from '../../lib/format'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useAllEmployees, type Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { BOARD_TODOS, useReassignTodo, useTodos, type Todo } from '../todos/todoApi'
import { TodoForm } from '../todos/TodoForm'
import { TodoItem } from '../todos/TodoItem'
import { TodoListView } from '../todos/TodoListView'
import { BOARD, useMoveNote, useNotes, useSaveNote, type Note } from './noteApi'
import { NoteDialogById } from './NoteDialog'
import { archiveByMonth, movedNote, movedTodo, NEW_COLUMN, pinboardColumns, type PinboardColumn } from './pinboard'
import styles from './PinboardPage.module.css'

/** Drop on the column under the pointer/finger; between columns the closest one (as on the other boards). */
const dropTarget: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : closestCorners(args)
}

/** Stable empty lists while loading – a new [] on every render would recompute the columns each time */
const NO_NOTES: Note[] = []
const NO_TODOS: Todo[] = []

/** What is dragged: a note (once per column it is in) or a to-do – "note|id|column", "todo|id|column" */
type Dragged = { kind: 'note' | 'todo'; id: string; columnId: string }
const dragId = (kind: Dragged['kind'], id: string, columnId: string) => `${kind}|${id}|${columnId}`
const parseDragId = (value: string): Dragged => {
  const [kind, id, columnId] = value.split('|')
  return { kind: kind as Dragged['kind'], id, columnId }
}

type View = 'board' | 'list' | 'shopping' | 'archive'
const VIEWS: { view: View; label: string; icon: typeof LayoutGrid }[] = [
  { view: 'board', label: 'Pinnwand', icon: LayoutGrid },
  { view: 'list', label: 'To-do-Liste', icon: ListTodo },
  { view: 'shopping', label: 'Einkaufsliste', icon: ShoppingCart },
  { view: 'archive', label: 'Archiv', icon: Archive },
]

/**
 * Pinboard and to-dos in one place (8e): per person what to know (notes) and what to do (to-dos).
 * The board, the to-do list with filters, the shopping list and the archive are views of it –
 * in the address (`view=`), so a tablet can open the shopping list directly.
 */
export function PinboardPage() {
  const [params, setParams] = useSearchParams()
  const canEdit = useCanEdit()
  const [openId, setOpenId] = useState<string | null>(null)
  const requested = params.get('view')
  const view: View = VIEWS.some((v) => v.view === requested) ? (requested as View) : 'board'
  const openTodos = useTodos(BOARD_TODOS)
  const shopping = useTodos({ shopping: true })
  const notes = useNotes(BOARD)
  const { data: employees } = useAllEmployees()

  const counts: Record<View, number | undefined> = {
    board: notes.data && openTodos.data ? notes.data.length + openTodos.data.length : undefined,
    list: openTodos.data?.length,
    shopping: shopping.data?.length,
    archive: undefined,
  }

  function show(next: View) {
    const query = new URLSearchParams()
    if (next !== 'board') query.set('view', next)
    // the person filter belongs to the lists
    const person = params.get('person')
    if (person && (next === 'list' || next === 'shopping')) query.set('person', person)
    setParams(query, { replace: true })
  }

  return (
    // the board uses the whole screen width (AppLayout: data-wide)
    <div data-wide={view === 'board' ? '' : undefined}>
      <div className={styles.header}>
        <h1>Pinnwand</h1>
        <div className={styles.views} role="group" aria-label="Ansicht">
          {VIEWS.map(({ view: v, label, icon }) => (
            <Button key={v} icon={icon} variant={view === v ? 'primary' : 'secondary'} aria-pressed={view === v} onClick={() => show(v)}>
              {label}
              {counts[v] !== undefined && <span className={styles.count}>{counts[v]}</span>}
            </Button>
          ))}
        </div>
      </div>

      {view === 'board' && (
        <Board notes={notes.data} notesError={notes.error} todos={openTodos.data} employees={employees} canEdit={canEdit} onOpen={setOpenId} />
      )}
      {view === 'list' && <TodoListView shopping={false} />}
      {view === 'shopping' && <TodoListView shopping />}
      {view === 'archive' && <ArchiveView employees={employees ?? []} onOpen={setOpenId} />}

      {openId && <NoteDialogById id={openId} canEdit={canEdit} onClose={() => setOpenId(null)} />}
    </div>
  )
}

/**
 * The board: "Neu" and one column per person from the employee list (bug #3) with their notes and
 * their open to-dos. Drag a note to another person (only that person is swapped – the old board
 * overwrote several people with one) or a to-do (it gets the new person). Click a note for the rest.
 */
function Board({
  notes: loadedNotes,
  notesError,
  todos: loadedTodos,
  employees,
  canEdit,
  onOpen,
}: {
  notes: Note[] | undefined
  notesError: Error | null
  todos: Todo[] | undefined
  employees: Employee[] | undefined
  canEdit: boolean
  onOpen: (id: string) => void
}) {
  const toast = useToast()
  const moveNote = useMoveNote()
  const reassign = useReassignTodo()
  const [dragging, setDragging] = useState<Dragged | null>(null)
  // after dropping: the card stays in its new column until the data itself shows it (no flash back)
  const [droppedNotes, setDroppedNotes] = useState<{ notes: Note[]; basedOn: Note[] } | null>(null)
  const [droppedTodos, setDroppedTodos] = useState<{ todos: Todo[]; basedOn: Todo[] } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Enter opens the note – only space picks a card up
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const notes = droppedNotes && droppedNotes.basedOn === loadedNotes ? droppedNotes.notes : (loadedNotes ?? NO_NOTES)
  const todos = droppedTodos && droppedTodos.basedOn === loadedTodos ? droppedTodos.todos : (loadedTodos ?? NO_TODOS)
  const columns = useMemo(() => pinboardColumns(notes, todos, employees ?? []), [notes, todos, employees])
  const columnTitle = (id: string) => (id === NEW_COLUMN ? 'Neu' : employees?.find((e) => e.id === id)?.name ?? '')

  if (notesError) return <p className="muted">Notizen konnten nicht geladen werden: {notesError.message}</p>
  if (!loadedNotes || !loadedTodos || !employees) return <p className="muted">Lade Pinnwand …</p>

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    if (!over || !loadedNotes || !loadedTodos) return
    const dragged = parseDragId(String(active.id))
    const toColumn = String(over.id)
    if (toColumn === dragged.columnId) return
    const fail = (what: string) => (error: Error) => toast.error(`«${what.slice(0, 40)}» nicht verschoben: ${reasonOf(error)}`)

    if (dragged.kind === 'todo') {
      const todo = loadedTodos.find((t) => t.id === dragged.id)!
      const arranged = movedTodo(loadedTodos, dragged.id, toColumn)
      setDroppedTodos({ todos: arranged, basedOn: loadedTodos })
      reassign.mutate(
        { id: dragged.id, assigneeId: toColumn === NEW_COLUMN ? null : toColumn, arranged },
        {
          onError: (error) => {
            setDroppedTodos(null)
            fail(todo.text)(error)
          },
        },
      )
      return
    }
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
          fail(note.text)(error)
        },
      },
    )
  }

  const draggedNote = dragging?.kind === 'note' ? notes.find((n) => n.id === dragging.id) : undefined
  const draggedTodo = dragging?.kind === 'todo' ? todos.find((t) => t.id === dragging.id) : undefined

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
          onDragStart: ({ active }) => (parseDragId(String(active.id)).kind === 'todo' ? 'To-do aufgenommen.' : 'Notiz aufgenommen.'),
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
            {column.todos.length > 0 && (
              <ul className={styles.todos} aria-label={`To-dos ${column.employee?.name ?? 'ohne Person'}`}>
                {column.todos.map((todo) => (
                  <DraggableTodo key={todo.id} todo={todo} column={column} canEdit={canEdit} />
                ))}
              </ul>
            )}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggedNote && dragging && <NoteCard note={draggedNote} columnId={dragging.columnId} employees={employees} dragging onOpen={() => undefined} />}
        {draggedTodo && (
          <div className={styles.todoOverlay}>
            <ListTodo aria-hidden /> {draggedTodo.text}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ column, canEdit, children }: { column: PinboardColumn; canEdit: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const title = column.employee?.name ?? 'Neu'
  const empty = column.notes.length === 0 && column.todos.length === 0
  return (
    <section className={styles.column} aria-label={title}>
      {/* name on the color bar, white/dark text – readable (UI review: yellow on yellow) */}
      <h2 className={styles.columnTitle} style={{ borderTopColor: column.employee?.color ?? 'var(--color-border-strong)' }}>
        {column.employee ? <NameBadge name={column.employee.name} color={column.employee.color} /> : 'Neu'}
        <span className="muted" title="Notizen · To-dos">
          {column.notes.length} · {column.todos.length}
        </span>
      </h2>
      {canEdit && <NewEntry column={column} />}
      <div ref={setNodeRef} className={[styles.drop, isOver && styles.over].filter(Boolean).join(' ')}>
        {children}
        {empty && <p className={styles.empty}>Nichts offen</p>}
      </div>
    </section>
  )
}

/** "+ Notiz" / "+ To-do" at the top of a column – for that person, or nobody in "Neu" */
function NewEntry({ column }: { column: PinboardColumn }) {
  const [open, setOpen] = useState<'note' | 'todo' | null>(null)

  if (open === 'todo') {
    return (
      <div className={styles.newEntry}>
        <TodoForm defaults={{ assigneeId: column.employee?.id }} onSaved={() => setOpen(null)} onCancel={() => setOpen(null)} />
      </div>
    )
  }
  if (open === 'note') return <NewNote column={column} onDone={() => setOpen(null)} />
  return (
    <div className={styles.addButtons}>
      <Button small variant="ghost" icon={Plus} onClick={() => setOpen('note')}>
        Notiz
      </Button>
      <Button small variant="ghost" icon={Plus} onClick={() => setOpen('todo')}>
        To-do
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

/** A to-do in a person's column – dragged by its grip, so checkbox and buttons stay simple to hit */
function DraggableTodo({ todo, column, canEdit }: { todo: Todo; column: PinboardColumn; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId('todo', todo.id, column.id), disabled: !canEdit })
  return (
    <TodoItem
      ref={setNodeRef}
      todo={todo}
      canEdit={canEdit}
      showTask
      showAssignee={column.employee === null}
      style={{ opacity: isDragging ? 0.35 : undefined }}
      dragHandle={
        canEdit ? (
          <button type="button" className={styles.grip} aria-label={`«${todo.text}» verschieben`} {...attributes} {...listeners}>
            <GripVertical aria-hidden />
          </button>
        ) : (
          <span />
        )
      }
    />
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId('note', note.id, column.id), disabled: !canEdit })
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
