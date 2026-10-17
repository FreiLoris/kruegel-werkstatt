import type { Employee } from '../employees/employeeApi'
import type { Todo } from './todoApi'

/** The column of to-dos nobody takes care of yet – always first, like "Neu" on the pinboard */
export const NOBODY_COLUMN = 'nobody'

export interface TodoColumn {
  /** employee ID, or {@link NOBODY_COLUMN} */
  id: string
  /** null = not assigned, or to someone no longer in the list */
  employee: Employee | null
  todos: Todo[]
}

/**
 * The open to-dos by person (FB-04: "gruppiert nach Mitarbeiter") – a column for every person in
 * the order of the employee list, also an empty one: it is where a to-do is dragged to. Whatever
 * belongs to nobody in the list (not assigned yet, someone who left) is in the first column, so it
 * is not lost. Inside a column the order stays (by deadline).
 */
export function todoColumns(todos: Todo[], people: Employee[]): TodoColumn[] {
  const listed = new Set(people.map((p) => p.id))
  return [
    { id: NOBODY_COLUMN, employee: null, todos: todos.filter((t) => !t.assigneeId || !listed.has(t.assigneeId)) },
    ...people.map((employee) => ({ id: employee.id, employee, todos: todos.filter((t) => t.assigneeId === employee.id) })),
  ]
}

/**
 * The person a to-do gets when dropped on `toColumn` – undefined when nothing changes. Compared with the
 * real assignment, not the column: a to-do of someone who left lies in "nicht zugewiesen" but is still
 * theirs, dropping it there must unassign it.
 */
export function assigneeAfterDrop(todo: Todo, toColumn: string): string | null | undefined {
  const assigneeId = toColumn === NOBODY_COLUMN ? null : toColumn
  return (todo.assigneeId ?? null) === assigneeId ? undefined : assigneeId
}

/** The to-dos after dragging one to another column – shown right away while the server saves */
export function movedTodo(todos: Todo[], todoId: string, toColumn: string): Todo[] {
  return todos.map((t) => (t.id === todoId ? { ...t, assigneeId: toColumn === NOBODY_COLUMN ? null : toColumn } : t))
}
