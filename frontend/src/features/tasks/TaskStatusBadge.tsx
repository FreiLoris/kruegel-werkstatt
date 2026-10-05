import { TASK_STATUS, type TaskStatus } from './taskApi'
import { legendClass, statusBadgeClass } from './taskStatusStyle'

/** Status as a small colored label – the text is always there, color is only a help. */
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={statusBadgeClass(status)}>{TASK_STATUS[status]}</span>
}

/** All statuses with their color – shown once per view. */
export function TaskStatusLegend() {
  return (
    <ul className={legendClass} aria-label="Legende Status">
      {(Object.keys(TASK_STATUS) as TaskStatus[]).map((status) => (
        <li key={status}>
          <TaskStatusBadge status={status} />
        </li>
      ))}
    </ul>
  )
}
