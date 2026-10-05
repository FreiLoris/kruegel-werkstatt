/** How urgent a deadline is, seen from today – one place for list, task and (later) dashboard. */
export type DueState = 'overdue' | 'today' | 'later' | 'none'

export function dueState(dueDate: string | null, today: string): DueState {
  if (!dueDate) return 'none'
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  return 'later'
}
