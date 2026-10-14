import type { Employee } from '../employees/employeeApi'
import type { Todo } from './todoApi'

export interface TodoGroup {
  /** employee ID, or null for the rest */
  id: string | null
  /** null = not assigned, or to someone no longer in the list */
  employee: Employee | null
  todos: Todo[]
}

/**
 * The open to-dos by person (FB-04: "gruppiert nach Mitarbeiter") – in the order of the employee
 * list, only people with something open. Whatever belongs to nobody in the list (not assigned yet,
 * someone who left) comes last, so it is not lost. Inside a group the order stays (by deadline).
 */
export function todosByPerson(todos: Todo[], people: Employee[]): TodoGroup[] {
  const listed = new Set(people.map((p) => p.id))
  const groups: TodoGroup[] = people
    .map((employee) => ({ id: employee.id, employee, todos: todos.filter((t) => t.assigneeId === employee.id) }))
    .filter((group) => group.todos.length > 0)
  const rest = todos.filter((t) => !t.assigneeId || !listed.has(t.assigneeId))
  return rest.length > 0 ? [...groups, { id: null, employee: null, todos: rest }] : groups
}
