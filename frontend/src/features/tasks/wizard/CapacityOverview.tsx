import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useToday } from '../../../lib/clock'
import { Button } from '../../../components/ui/Button'
import { isoWeek, isWeekend, mondayOf, nextWorkingDay, weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate } from '../../../lib/format'
import { useAllLifts } from '../../lifts/liftApi'
import { DayGrid, type Slot } from '../day/DayGrid'
import { WeekView } from '../week/WeekView'
import { useTasksBetween, useTasksOfDay } from '../taskApi'
import styles from './CapacityOverview.module.css'

/** Pixels per minute – smaller than the day view, it shares the screen with the form */
const SCALE = 0.9

interface CapacityOverviewProps {
  /** chosen so far: date '' = none yet */
  picked: Slot
  /** date → holiday name */
  holidays: ReadonlyMap<string, string>
  /** a day chosen in the week strip – time and duration stay */
  onPickDay: (date: string) => void
  /** dragged open (or tapped) in the day's grid: lift, start and end */
  onPickSlot: (slot: Slot) => void
  /** when editing: the task itself – not in the way of its own new place */
  taskId?: string
}

/**
 * Where is room? (6k) The week with the number of tasks per day, below it the chosen day as a
 * time grid per lift – dragging open a free area takes over lift, start and end. A lift already
 * taken at that time shows red ("belegt"). Weekends only appear when there are tasks.
 * "Tag | Woche" (FB-13): the week as on "Termine › Woche" – who comes when, who is away – to find a
 * day without clicking through; a day opens its time grid again. The form stays as it is.
 */
export function CapacityOverview({ picked, holidays, onPickDay, onPickSlot, taskId }: CapacityOverviewProps) {
  const today = useToday()
  const holidayDates = new Set(holidays.keys())
  // on a weekend or holiday the next working day – not the week that is over (UX M-09)
  const [day, setDay] = useState(() => picked.date || nextWorkingDay(today, holidayDates))
  const [monday, setMonday] = useState(() => mondayOf(day))
  const [view, setView] = useState<'day' | 'week'>('day')
  // A date typed in the form shows its day ("adjust state while rendering", no effect needed)
  const [shownFor, setShownFor] = useState(picked.date)
  if (picked.date !== shownFor) {
    setShownFor(picked.date)
    if (picked.date) {
      setDay(picked.date)
      setMonday(mondayOf(picked.date))
    }
  }

  const sunday = addDays(monday, 6)
  const week = useTasksBetween(monday, sunday)
  const dayTasks = useTasksOfDay(day)
  const { data: lifts } = useAllLifts()
  const counts = new Map<string, number>()
  for (const task of week.data ?? []) counts.set(task.date, (counts.get(task.date) ?? 0) + 1)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (d) => !isWeekend(d) || counts.has(d) || d === picked.date,
  )

  /** Another week shows its first working day below – not the old day of another week (UX M-09) */
  function showWeek(newMonday: string) {
    setMonday(newMonday)
    setDay(picked.date && mondayOf(picked.date) === newMonday ? picked.date : nextWorkingDay(newMonday, holidayDates))
  }

  function choose(d: string) {
    setDay(d)
    onPickDay(d)
  }

  /** A day of the week: its time grid, to drag the slot there */
  function openDay(d: string) {
    choose(d)
    setView('day')
  }

  return (
    <section className={styles.overview} aria-labelledby="capacity-heading">
      <div className={styles.header}>
        <h2 id="capacity-heading">
          KW {isoWeek(monday)} <span className="muted">· {formatDate(monday).slice(0, 6)}–{formatDate(addDays(monday, 4))}</span>
        </h2>
        <div className={styles.nav}>
          <div className={styles.views} role="group" aria-label="Ansicht">
            <Button small variant={view === 'day' ? 'primary' : 'secondary'} aria-pressed={view === 'day'} onClick={() => setView('day')}>
              Tag
            </Button>
            <Button small variant={view === 'week' ? 'primary' : 'secondary'} aria-pressed={view === 'week'} onClick={() => setView('week')}>
              Woche
            </Button>
          </div>
          <Button small variant="ghost" icon={ChevronLeft} onClick={() => showWeek(addDays(monday, -7))} aria-label="Vorherige Woche" />
          <Button small variant="ghost" onClick={() => showWeek(mondayOf(nextWorkingDay(today, holidayDates)))}>
            Heute
          </Button>
          <Button small variant="ghost" icon={ChevronRight} onClick={() => showWeek(addDays(monday, 7))} aria-label="Nächste Woche" />
        </div>
      </div>
      {view === 'day' && week.error && <p className="muted">Termine konnten nicht geladen werden: {week.error.message}</p>}

      {view === 'week' ? (
        <>
          <WeekView monday={monday} onOpenDay={openDay} readOnly compact />
          <p className={styles.legend}>Einen Tag antippen öffnet ihn im Raster – dort Lift und Zeit wählen.</p>
        </>
      ) : (
        <>
          <div className={styles.week} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d) => {
              const count = counts.get(d) ?? 0
              const holiday = holidays.get(d)
              return (
                <button
                  key={d}
                  type="button"
                  className={[styles.day, d === today && styles.today, d === day && styles.shown, holiday && styles.holiday]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => choose(d)}
                  aria-pressed={d === picked.date}
                >
                  <span className={styles.dayName}>
                    {WEEKDAYS_SHORT[weekdayOf(d)]} {formatDate(d).slice(0, 6)}
                  </span>
                  <span className={styles.dayInfo}>{holiday ?? (count === 1 ? '1 Termin' : `${count} Termine`)}</span>
                </button>
              )
            })}
          </div>

          <h3 className={styles.dayTitle}>
            {WEEKDAYS_SHORT[weekdayOf(day)]} {formatDate(day)}
            {holidays.has(day) && <span className={styles.holidayName}> · {holidays.get(day)}</span>}
          </h3>
          {dayTasks.data && lifts ? (
            <DayGrid
              date={day}
              tasks={dayTasks.data}
              lifts={lifts}
              mode="pick"
              scale={SCALE}
              canEdit
              onPick={onPickSlot}
              picked={picked.date ? picked : null}
              hiddenTaskId={taskId}
            />
          ) : (
            <p className="muted">Lade Termine …</p>
          )}
          <p className={styles.legend}>
            Im Raster ziehen übernimmt Lift, Beginn und Ende (am Tablet: kurz halten, dann ziehen) – tippen eine Stunde.
          </p>
        </>
      )}
    </section>
  )
}
