import { StickyNote } from 'lucide-react'
import { useToday } from '../../lib/clock'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { BOARD, useNotes, type Note } from '../notes/noteApi'
import { pinboardColumns } from '../notes/pinboard'
import { BOARD_TODOS, useTodos, type Todo } from '../todos/todoApi'
import { byUrgency, dueLabel, dueState } from '../todos/todoDue'
import styles from './BoardOverview.module.css'
import { FittingList } from '../../components/ui/FittingList'

/** Per column at most this many – nobody scrolls on the TV; the rest is "+ n weitere" */
const MAX_NOTES = 3
const MAX_TODOS = 5

/**
 * The pinboard in small (10b): per person their notes and open to-dos, the most urgent first and
 * overdue ones with their date (UI review: only an icon). Names as badges – readable on every
 * color (UI review: "Reto" yellow on yellow). Only to look at: ticking off happens on the
 * pinboard – on the TV nothing can be ticked by accident (F5).
 */
export function BoardOverview() {
  const notes = useNotes(BOARD)
  const todos = useTodos(BOARD_TODOS)
  const { data: employees } = useAllEmployees()
  const today = useToday()

  // the data wins: after a backend restart the TV keeps the board instead of an error
  if (!notes.data || !todos.data || !employees) {
    const error = (!notes.data && notes.error) || (!todos.data && todos.error)
    return <p className="muted">{error ? `Pinnwand konnte nicht geladen werden: ${error.message}` : 'Lade Pinnwand …'}</p>
  }

  // "Neu" only when something is waiting there; every person always (an empty column says "nichts offen")
  const columns = pinboardColumns(notes.data, todos.data, employees).filter((c) => c.employee || c.notes.length + c.todos.length > 0)

  return (
    <div className={styles.columns} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(7.5rem, 1fr))` }}>
      {columns.map((column) => (
        <section key={column.id} className={styles.column} aria-label={column.employee?.name ?? 'Neu'}>
          <h3 className={styles.head}>
            {column.employee ? <NameBadge name={column.employee.name} color={column.employee.color} /> : <span className={styles.new}>Neu</span>}
          </h3>
          {column.notes.length + column.todos.length === 0 ? (
            <p className="muted">nichts offen</p>
          ) : (
            // notes first, then the to-dos by urgency – as many as fit the column (the TV cannot scroll)
            <FittingList
              className={styles.items}
              moreTo={column.todos.length > 0 ? (column.employee ? `/todos?person=${column.employee.id}` : '/todos') : '/pinboard'}
              alsoHidden={Math.max(column.notes.length - MAX_NOTES, 0) + Math.max(column.todos.length - MAX_TODOS, 0)}
            >
              {column.notes.slice(0, MAX_NOTES).map((note) => (
                <li key={note.id}>
                  <NoteLine note={note} />
                </li>
              ))}
              {byUrgency(column.todos)
                .slice(0, MAX_TODOS)
                .map((todo) => (
                  <li key={todo.id}>
                    <TodoLine todo={todo} today={today} />
                  </li>
                ))}
            </FittingList>
          )}
        </section>
      ))}
    </div>
  )
}

function NoteLine({ note }: { note: Note }) {
  return (
    <div className={styles.note}>
      <StickyNote size={14} aria-hidden className={styles.noteIcon} />
      <span className={styles.text}>{note.text}</span>
      {note.todoCount > 0 && (
        <span className={styles.progress} aria-label={`${note.todoDoneCount} von ${note.todoCount} Aufgaben erledigt`}>
          {note.todoDoneCount}/{note.todoCount}
        </span>
      )}
    </div>
  )
}

function TodoLine({ todo, today }: { todo: Todo; today: string }) {
  const state = dueState(todo.dueDate, today)
  return (
    <div className={styles.todo}>
      {/* an empty box as a sign – not a checkbox: here nothing is ticked off (F5) */}
      <span className={styles.box} aria-hidden />
      <span className={styles.text}>{todo.text}</span>
      {state !== 'none' && state !== 'later' && <span className={[styles.due, styles[state]].join(' ')}>{dueLabel(todo.dueDate, today)}</span>}
    </div>
  )
}
