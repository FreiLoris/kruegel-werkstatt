import { ChevronRight, StickyNote } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { todayIso } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { BOARD, useNotes, type Note } from '../notes/noteApi'
import { pinboardColumns } from '../notes/pinboard'
import { BOARD_TODOS, useTodos, type Todo } from '../todos/todoApi'
import { byUrgency, dueLabel, dueState } from '../todos/todoDue'
import styles from './BoardOverview.module.css'

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
  const today = todayIso()

  const error = notes.error ?? todos.error
  if (error) return <p className="muted">Pinnwand konnte nicht geladen werden: {error.message}</p>
  if (!notes.data || !todos.data || !employees) return <p className="muted">Lade Pinnwand …</p>

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
            <>
              <Limited items={column.notes} max={MAX_NOTES} className={styles.notes} render={(note) => <NoteLine note={note} />} />
              <Limited items={byUrgency(column.todos)} max={MAX_TODOS} className={styles.todos} render={(todo) => <TodoLine todo={todo} today={today} />} />
            </>
          )}
        </section>
      ))}
    </div>
  )
}

/** The first `max` items and "+ n weitere" – linking to the pinboard where all are */
function Limited<T extends { id: string }>({ items, max, className, render }: { items: T[]; max: number; className: string; render: (item: T) => ReactNode }) {
  if (items.length === 0) return null
  const rest = items.length - max
  return (
    <ul className={className}>
      {items.slice(0, max).map((item) => (
        <li key={item.id}>{render(item)}</li>
      ))}
      {rest > 0 && (
        <li>
          <Link to="/pinboard" className={styles.more}>
            + {rest} weitere <ChevronRight size={14} aria-hidden />
          </Link>
        </li>
      )}
    </ul>
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
