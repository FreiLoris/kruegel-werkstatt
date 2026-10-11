import { CalendarOff } from 'lucide-react'
import { Link } from 'react-router'
import { useTasksWithoutAppointment } from '../tasks/taskApi'
import styles from './WithoutAppointment.module.css'

/**
 * The orders without appointment on the dashboard: how many and whose – in the title row, so the
 * TV loses no height. They are in no day of the week below; without this line nobody in the
 * workshop would see them (feedback: "suscht vergisst mers"). Nothing when everything is planned.
 */
export function WithoutAppointment() {
  const { data: tasks } = useTasksWithoutAppointment()
  if (!tasks || tasks.length === 0) return null

  // the oldest first, as in the list; the line is cut off with "…" when the screen is too narrow
  const names = tasks.map((task) => task.customer.displayName).join(' · ')
  return (
    <Link to="/tasks?view=unplanned" className={styles.line} title={`Ohne Termin: ${names}`}>
      <CalendarOff aria-hidden />
      <strong>{tasks.length} ohne Termin</strong>
      {/* the dot is text, not a gap: read aloud or copied, number and names stay apart */}
      <span className={styles.names}>· {names}</span>
    </Link>
  )
}
