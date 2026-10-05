import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { Button } from '../../../components/ui/Button'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, formatTime, todayIso } from '../../../lib/format'
import { useAllEmployees } from '../../employees/employeeApi'
import { useAllLifts } from '../../lifts/liftApi'
import { usePublicHolidays } from '../../publicholidays/publicHolidayApi'
import { useAllServiceItems } from '../../service-items/serviceItemApi'
import { tasksBetweenKey, useTasksBetween } from '../taskApi'
import { TaskStatusLegend } from '../TaskStatusBadge'
import { DayBoard } from './DayBoard'
import { dayColumns } from './dayColumns'
import styles from './DayViewPage.module.css'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Appointments of one day, one column per lift. The day is in the URL (?date=2026-10-15):
 * reload, browser back and a bookmark on the workshop tablet keep it.
 */
export function DayViewPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const today = todayIso()
  const requested = params.get('date')
  const date = requested && ISO_DATE.test(requested) ? requested : today

  const tasks = useTasksBetween(date, date)
  const { data: lifts } = useAllLifts()
  const { data: employees } = useAllEmployees()
  const { data: serviceItems } = useAllServiceItems()
  const { data: holidays } = usePublicHolidays(date, date)
  const canEdit = useCanEdit()

  const serviceItemNames = useMemo(() => new Map((serviceItems ?? []).map((s) => [s.id, s.name])), [serviceItems])
  const columns = useMemo(() => dayColumns(tasks.data ?? [], lifts ?? []), [tasks.data, lifts])

  const go = (day: string) => setParams(day === today ? {} : { date: day })
  const holiday = holidays?.[0]?.name

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Termine</h1>
          <p className={styles.date}>
            <strong>
              {WEEKDAYS_SHORT[weekdayOf(date)]} {formatDate(date)}
            </strong>
            {date === today && <span className="muted"> · heute</span>}
            {holiday && <span className={styles.holiday}> · {holiday}</span>}
            {tasks.data && <span className="muted"> · {tasks.data.length === 1 ? '1 Termin' : `${tasks.data.length} Termine`}</span>}
          </p>
        </div>
        <div className={styles.nav}>
          <Button icon={ChevronLeft} onClick={() => go(addDays(date, -1))} aria-label="Vorheriger Tag" />
          <Button onClick={() => go(today)} disabled={date === today}>
            Heute
          </Button>
          <Button icon={ChevronRight} onClick={() => go(addDays(date, 1))} aria-label="Nächster Tag" />
          <input
            type="date"
            className={styles.picker}
            value={date}
            onChange={(e) => e.target.value && go(e.target.value)}
            aria-label="Datum wählen"
          />
          {canEdit && (
            <Button variant="primary" icon={Plus} onClick={() => navigate('/tasks/new')}>
              Neuer Auftrag
            </Button>
          )}
        </div>
      </div>
      <TaskStatusLegend />

      <div className={styles.content}>
        {tasks.error ? (
          <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>
        ) : !tasks.data || !lifts || !employees ? (
          <p className="muted">Lade Termine …</p>
        ) : (
          <>
            {tasks.data.length === 0 && <NextAppointment after={date} onGo={go} />}
            <DayBoard
              columns={columns}
              tasks={tasks.data}
              dayKey={tasksBetweenKey(date, date)}
              employees={employees}
              serviceItemNames={serviceItemNames}
              canEdit={canEdit}
            />
          </>
        )}
      </div>
    </>
  )
}

/** Empty day: when is the next appointment? (UI review: a big empty area said nothing) */
function NextAppointment({ after, onGo }: { after: string; onGo: (date: string) => void }) {
  const { data } = useTasksBetween(addDays(after, 1), addDays(after, 60))
  const next = data?.[0]
  if (!data) return null
  return (
    <p className={styles.next}>
      Keine Termine an diesem Tag.{' '}
      {next ? (
        <>
          Nächster Termin:{' '}
          <Button variant="ghost" small onClick={() => onGo(next.date)}>
            {WEEKDAYS_SHORT[weekdayOf(next.date)]} {formatDate(next.date)}, {formatTime(next.time)} – {next.customer.displayName}
          </Button>
        </>
      ) : (
        'Auch in den nächsten 60 Tagen keine.'
      )}
    </p>
  )
}
