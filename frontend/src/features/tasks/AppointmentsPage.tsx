import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { isoWeek, mondayOf, weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../lib/format'
import { usePublicHolidays } from '../publicholidays/publicHolidayApi'
import styles from './AppointmentsPage.module.css'
import { DayView } from './day/DayView'
import { TaskSearch } from './TaskSearch'
import { TaskStatusLegend } from './TaskStatusBadge'
import { WeekView } from './week/WeekView'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

type View = 'day' | 'week'

/**
 * "Termine": day view (one column per lift) or week view (one column per day), switchable.
 * View and date are in the URL (?view=week&date=2026-10-15): reload, browser back and a bookmark
 * on the workshop tablet keep them – and "Termine" stays the active navigation entry.
 */
export function AppointmentsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const today = todayIso()
  const requested = params.get('date')
  const date = requested && ISO_DATE.test(requested) ? requested : today
  const view: View = params.get('view') === 'week' ? 'week' : 'day'
  const monday = mondayOf(date)
  const { data: holidays } = usePublicHolidays(date, date)

  function show(nextView: View, nextDate: string) {
    const next: Record<string, string> = {}
    if (nextView === 'week') next.view = 'week'
    if (nextDate !== today) next.date = nextDate
    setParams(next)
  }

  const step = view === 'week' ? 7 : 1
  const isCurrent = view === 'week' ? monday === mondayOf(today) : date === today

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Termine</h1>
          <p className={styles.date}>
            {view === 'day' ? (
              <>
                <strong>
                  {WEEKDAYS_SHORT[weekdayOf(date)]} {formatDate(date)}
                </strong>
                {date === today && <span className="muted"> · heute</span>}
                {holidays?.[0] && <span className={styles.holiday}> · {holidays[0].name}</span>}
              </>
            ) : (
              <>
                <strong>KW {isoWeek(monday)}</strong>
                <span className="muted">
                  {' '}
                  · {formatDate(monday).slice(0, 6)}–{formatDate(addDays(monday, 6))}
                </span>
              </>
            )}
          </p>
        </div>
        <div className={styles.actions}>
          <TaskSearch onOpen={(task) => show('day', task.date)} />
          {canEdit && (
            <Button variant="primary" icon={Plus} onClick={() => navigate('/tasks/new')}>
              Neuer Auftrag
            </Button>
          )}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.views} role="group" aria-label="Ansicht">
          <Button variant={view === 'day' ? 'primary' : 'secondary'} aria-pressed={view === 'day'} onClick={() => show('day', date)}>
            Tag
          </Button>
          <Button variant={view === 'week' ? 'primary' : 'secondary'} aria-pressed={view === 'week'} onClick={() => show('week', date)}>
            Woche
          </Button>
        </div>
        <div className={styles.nav}>
          <Button
            icon={ChevronLeft}
            onClick={() => show(view, addDays(date, -step))}
            aria-label={view === 'week' ? 'Vorherige Woche' : 'Vorheriger Tag'}
          />
          <Button onClick={() => show(view, today)} disabled={isCurrent}>
            Heute
          </Button>
          <Button icon={ChevronRight} onClick={() => show(view, addDays(date, step))} aria-label={view === 'week' ? 'Nächste Woche' : 'Nächster Tag'} />
          <input
            type="date"
            className={styles.picker}
            value={date}
            onChange={(e) => e.target.value && show(view, e.target.value)}
            aria-label="Datum wählen"
          />
        </div>
        <TaskStatusLegend />
      </div>

      <div className={styles.content}>
        {view === 'day' ? (
          <DayView date={date} onGo={(day) => show('day', day)} />
        ) : (
          <WeekView monday={monday} onOpenDay={(day) => show('day', day)} />
        )}
      </div>
    </>
  )
}
