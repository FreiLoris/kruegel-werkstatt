import { isoWeek } from '../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../lib/format'
import styles from './DashboardPage.module.css'
import { dashboardMonday } from './shownWeek'
import { DashboardWeek } from './DashboardWeek'

/**
 * Start page and workshop TV (phase 10): the week at a glance. On a "view only" device (the TV)
 * the app frame hides its header and shows the navigation at the bottom (AppLayout).
 */
export function DashboardPage() {
  const today = todayIso()
  const monday = dashboardMonday(today)
  const nextWeek = monday > today

  return (
    // uses the whole screen width (AppLayout: data-wide)
    <div data-wide className={styles.page}>
      <h1 className={styles.title}>
        {nextWeek ? 'Nächste Woche' : 'Diese Woche'}
        <span className={styles.week}>
          KW {isoWeek(monday)} · {formatDate(monday).slice(0, 6)} – {formatDate(addDays(monday, 4))}
        </span>
      </h1>
      <DashboardWeek monday={monday} />
    </div>
  )
}
