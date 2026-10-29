import type { Customer } from '../customers/customerSearchApi'
import { reminderOutcomeText, reminderSummary } from './reminder'
import { useTaskReminders } from './reminderApi'

/**
 * The task's "Erinnerung" (17d): what happened once the run was there – sent, or why someone has to
 * call – before that how it will be.
 */
export function TaskReminderStatus({ taskId, customer, remind }: { taskId: string; customer: Customer; remind: boolean }) {
  const { data: reminders } = useTaskReminders(taskId)
  const latest = reminders?.[0]
  return <span>{latest ? reminderOutcomeText(latest) : reminderSummary(customer, remind)}</span>
}
