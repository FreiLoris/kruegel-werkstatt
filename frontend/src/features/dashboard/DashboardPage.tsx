import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useToday } from '../../lib/clock'
import { isoWeek, weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate } from '../../lib/format'
import { ModuleGate } from '../modules/ModuleGate'
import { useModulesOn } from '../modules/moduleApi'
import { TaskStatusLegend } from '../tasks/TaskStatusBadge'
import { BoardOverview } from './BoardOverview'
import styles from './DashboardPage.module.css'
import { dashboardMonday } from './shownWeek'
import { DashboardWeek } from './DashboardWeek'
import { PresentToday } from './PresentToday'
import { TodayByLift } from './TodayByLift'
import { WithoutAppointment } from './WithoutAppointment'

/**
 * Start page and workshop TV (phase 10): the week at a glance, below what is on which lift today and
 * the pinboard in small. Orders without appointment are in no day – the title row names them, the line
 * below it says who is in today. On a "view only" device (the TV) the app frame hides its header and shows
 * the navigation at the bottom (AppLayout).
 */
export function DashboardPage() {
  const today = useToday()
  const moduleOn = useModulesOn()
  const monday = dashboardMonday(today)
  const nextWeek = monday > today

  return (
    // uses the whole screen width (AppLayout: data-wide)
    <div data-wide className={styles.page}>
      {/* one block: "Heute da" is missing on a weekend and while loading – the TV's rows below must not move */}
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {nextWeek ? 'Nächste Woche' : 'Diese Woche'}
            <span className={styles.week}>
              KW {isoWeek(monday)} · {formatDate(monday).slice(0, 6)} – {formatDate(addDays(monday, 4))}
            </span>
          </h1>
          <WithoutAppointment />
        </div>
        <PresentToday />
      </div>
      <DashboardWeek monday={monday} />
      <div className={styles.below}>
        <section className={styles.area} aria-labelledby="today-heading">
          <div className={styles.areaHead}>
            <h2 id="today-heading" className={styles.areaTitle}>
              Heute, {WEEKDAYS_SHORT[weekdayOf(today)]} {formatDate(today).slice(0, 6)} – nach Lift
            </h2>
            {/* what bar color and sign mean (UX M-12) – next to the heading, the TV needs the line */}
            <TaskStatusLegend />
          </div>
          <TodayByLift />
        </section>
        {/* neutral 3: gone when the workshop uses neither */}
        {(moduleOn('PINBOARD') || moduleOn('TODOS')) && (
          <section className={styles.area} aria-labelledby="board-heading">
            <h2 id="board-heading" className={styles.areaTitle}>
              Pinnwand & To-dos
              {/* FB-04: two pages now – the overview stays one, per person */}
              <span className={styles.areaLinks}>
                <ModuleGate module="PINBOARD">
                  <Link to="/pinboard" className={styles.areaLink}>
                    Pinnwand <ChevronRight size={16} aria-hidden />
                  </Link>
                </ModuleGate>
                <ModuleGate module="TODOS">
                  <Link to="/todos" className={styles.areaLink}>
                    To-dos <ChevronRight size={16} aria-hidden />
                  </Link>
                </ModuleGate>
              </span>
            </h2>
            <BoardOverview />
          </section>
        )}
      </div>
    </div>
  )
}
