import { isWeekend } from '../../lib/calendar'
import { useToday } from '../../lib/clock'
import { useAbsences } from '../absences/absenceApi'
import { useAllEmployees } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { usePublicHolidays } from '../publicholidays/publicHolidayApi'
import { presenceOn } from './presenceToday'
import styles from './PresentToday.module.css'

/**
 * "Heute da" on the dashboard (12h): who is in the workshop today at a glance, behind it who is
 * away and why. One line – the TV cannot scroll. Nothing while loading or when nobody is expected
 * (weekend, public holiday).
 */
export function PresentToday() {
  const today = useToday()
  const { data: employees } = useAllEmployees()
  const { data: absences } = useAbsences(today, today)
  const { data: holidays } = usePublicHolidays(today, today)
  if (!employees || !absences || !holidays) return null

  const workingDay = !isWeekend(today) && holidays.length === 0
  const { present, away } = presenceOn(employees, absences, today, workingDay)
  if (present.length === 0 && away.length === 0) return null

  return (
    <p className={styles.line} aria-label="Wer ist heute da">
      <span className={styles.label}>Heute da</span>
      {present.length === 0 && <span className="muted">niemand</span>}
      {present.map(({ employee, label }) => (
        <span key={employee.id} className={styles.person}>
          <NameBadge name={employee.name} color={employee.color} />
          {label && <span className={styles.part}>{label}</span>}
        </span>
      ))}
      {away.length > 0 && (
        <span className={styles.away}>
          <span className={styles.label}>Abwesend</span>
          {away.map(({ employee, reason }) => `${employee.name} (${reason})`).join(' · ')}
        </span>
      )}
    </p>
  )
}
