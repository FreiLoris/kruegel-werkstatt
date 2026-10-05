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
