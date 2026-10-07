import type { Employee } from '../employees/employeeApi'
import type { Todo } from '../todos/todoApi'
import type { Note } from './noteApi'

/** Column of notes nobody takes care of yet – always first */
export const NEW_COLUMN = 'new'

export interface PinboardColumn {
  /** employee ID, or {@link NEW_COLUMN} */
  id: string
  /** null = "Neu" */
  employee: Employee | null
  notes: Note[]
  /** open to-dos of this person (8e: one board for "what to know" and "what to do") */
  todos: Todo[]
}

/**
 * The columns of the pinboard: "Neu" first, then every active person with a pinboard column in the
 * order of the employee list (bug #3: the old board had five fixed names). A note for several people
 * appears in each of their columns; a to-do in the column of its person. Whatever belongs to nobody
 * with a column (nobody yet, left, no column) stays visible in "Neu" – it must not disappear.
 */
export function pinboardColumns(notes: Note[], todos: Todo[], employees: Employee[]): PinboardColumn[] {
  const people = employees.filter((e) => e.active && e.hasPinboardColumn)
  const withColumn = new Set(people.map((p) => p.id))
  return [
    {
      id: NEW_COLUMN,
      employee: null,
      notes: notes.filter((n) => !n.assigneeIds.some((id) => withColumn.has(id))),
      todos: todos.filter((t) => !t.assigneeId || !withColumn.has(t.assigneeId)),
    },
    ...people.map((employee) => ({
      id: employee.id,
      employee,
      notes: notes.filter((n) => n.assigneeIds.includes(employee.id)),
      todos: todos.filter((t) => t.assigneeId === employee.id),
    })),
  ]
}

/** The to-dos after dragging one to another column – shown right away while the server saves */
export function movedTodo(todos: Todo[], todoId: string, toColumn: string): Todo[] {
  return todos.map((t) => (t.id === todoId ? { ...t, assigneeId: toColumn === NEW_COLUMN ? null : toColumn } : t))
}

/**
 * The notes after dragging one from a column to another – shown right away while the server saves
 * (the same rule as the server: only that person is swapped).
 */
export function movedNote(notes: Note[], noteId: string, fromColumn: string, toColumn: string): Note[] {
  return notes.map((n) => {
    if (n.id !== noteId) return n
    const without = n.assigneeIds.filter((id) => id !== fromColumn)
    const assigneeIds = toColumn === NEW_COLUMN || without.includes(toColumn) ? without : [...without, toColumn]
    return { ...n, assigneeIds }
  })
}

/** The archive in months – "Oktober 2026" – newest first (UI review: no groups, no search). */
export function archiveByMonth(notes: Note[]): { month: string; notes: Note[] }[] {
  const groups = new Map<string, Note[]>()
  for (const note of notes) {
    const month = monthOf(note.archivedAt!)
    groups.set(month, [...(groups.get(month) ?? []), note])
  }
  return [...groups.entries()].map(([month, list]) => ({ month, notes: list }))
}

const monthFormat = new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', month: 'long', year: 'numeric' })

/** "Oktober 2026" – in Swiss time, so a note archived just after midnight on the 1st is in the new month */
function monthOf(instant: string): string {
  return monthFormat.format(new Date(instant))
}
