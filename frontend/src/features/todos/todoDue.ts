import { formatDate } from '../../lib/format'

/** How urgent a deadline is, seen from today – one place for list, task and (later) dashboard. */
export type DueState = 'overdue' | 'today' | 'later' | 'none'

export function dueState(dueDate: string | null, today: string): DueState {
  if (!dueDate) return 'none'
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  return 'later'
}

/** "überfällig seit 14.10.2026" / "heute" / "bis 20.10.2026" / "" (UI review: overdue showed only an icon) */
export function dueLabel(dueDate: string | null, today: string): string {
  switch (dueState(dueDate, today)) {
    case 'overdue':
      return `überfällig seit ${formatDate(dueDate!)}`
    case 'today':
      return 'heute fällig'
    case 'later':
      return `bis ${formatDate(dueDate!)}`
    case 'none':
      return ''
  }
}

/**
 * Most urgent first: by deadline (overdue ones are the earliest), to-dos without a deadline at the
 * end – the dashboard shows only a few per person, so the important ones must be on top.
 */
export function byUrgency<T extends { dueDate: string | null }>(todos: T[]): T[] {
  return [...todos].sort((a, b) => {
    if (a.dueDate === b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
}
