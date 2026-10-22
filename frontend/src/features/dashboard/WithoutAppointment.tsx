import { CalendarOff } from 'lucide-react'
import { Link } from 'react-router'
import { unplannedCount } from '../tasks/unplanned/unplannedGroups'
import { useUnplanned } from '../tasks/unplanned/useUnplanned'
import styles from './WithoutAppointment.module.css'

/**
 * The orders without appointment on the dashboard: how many and whose – in the title row, so the
 * TV loses no height. They are in no day of the week below; without this line nobody in the
 * workshop would see them (feedback: "suscht vergisst mers"). Nothing when everything is planned.
 */
export function WithoutAppointment() {
  const { data: groups } = useUnplanned()
  if (!groups) return null
  const count = unplannedCount(groups)
  if (!count) return null

  // as in the list: waiting for parts, then the others; the line is cut off with "…" when too narrow
  const names = [...groups.waitingForParts, ...groups.withoutAppointment].map((task) => task.customer.displayName).join(' · ')
  return (
    <Link to="/tasks?view=unplanned" className={styles.line} title={`Ohne Termin: ${names}`}>
      <CalendarOff aria-hidden />
      {/* one line of text, cut off at the end: "2 ohne Termin · 1 wartet auf Material · Huber Peter · …" (FB-15) */}
      <span className={styles.text}>
        <strong>{count}</strong> · {names}
      </span>
    </Link>
  )
}
