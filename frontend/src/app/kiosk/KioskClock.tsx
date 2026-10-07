import { weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { useClock } from '../../lib/clock'
import { formatDate } from '../../lib/format'
import styles from './KioskClock.module.css'

/** Date and time on the TV – large, and they move on by themselves (bug #15) */
export function KioskClock() {
  const { today, time } = useClock()
  return (
    <span className={styles.clock}>
      <span className={styles.date}>
        {WEEKDAYS_SHORT[weekdayOf(today)]} {formatDate(today)}
      </span>
      <time className={styles.time} dateTime={`${today}T${time}`}>
        {time}
      </time>
    </span>
  )
}
