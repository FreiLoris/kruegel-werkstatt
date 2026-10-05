import styles from './taskStatus.module.css'
import type { TaskStatus } from './taskApi'

/**
 * CSS class per status – together with TASK_STATUS the ONE definition of how a status looks
 * (F10: the old app had three different color sets). The colors themselves are tokens.
 */
const STATUS_CLASS: Record<TaskStatus, string> = {
  RECEIVED: styles.received,
  IN_PROGRESS: styles.inProgress,
  WAITING_FOR_PARTS: styles.waiting,
  DONE: styles.done,
}

export function statusBadgeClass(status: TaskStatus): string {
  return `${styles.badge} ${STATUS_CLASS[status]}`
}

/** The colored bar on the left of a card, matching the badge. */
export function statusAccentClass(status: TaskStatus): string {
  return `${styles.accent} ${STATUS_CLASS[status]}`
}

export const legendClass = styles.legend
