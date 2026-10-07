import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { isoWeek } from '../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../lib/format'
import { BoardOverview } from './BoardOverview'
import styles from './DashboardPage.module.css'
import { dashboardMonday } from './shownWeek'
import { DashboardWeek } from './DashboardWeek'
import { TodayByLift } from './TodayByLift'

/**
 * Start page and workshop TV (phase 10): the week at a glance, below what is on which lift today and
 * the pinboard in small. On a "view only" device (the TV) the app frame hides its header and shows
 * the navigation at the bottom (AppLayout).
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
      <div className={styles.below}>
        <section className={styles.area} aria-labelledby="today-heading">
          <h2 id="today-heading" className={styles.areaTitle}>
            Heute nach Lift
          </h2>
          <TodayByLift />
        </section>
        <section className={styles.area} aria-labelledby="board-heading">
          <h2 id="board-heading" className={styles.areaTitle}>
            Pinnwand & To-dos
            <Link to="/pinboard" className={styles.areaLink}>
              Zur Pinnwand <ChevronRight size={16} aria-hidden />
            </Link>
          </h2>
          <BoardOverview />
        </section>
      </div>
    </div>
  )
}
