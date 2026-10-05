import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { isoWeek, isWeekend, mondayOf, weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, todayIso } from '../../../lib/format'
import { useAllLifts } from '../../lifts/liftApi'
import { DayGrid, type Slot } from '../day/DayGrid'
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
}

/**
 * Where is room? (6k) The week with the number of tasks per day, below it the chosen day as a
 * time grid per lift – dragging open a free area takes over lift, start and end. A lift already
 * taken at that time shows red ("belegt"). Weekends only appear when there are tasks.
 */
export function CapacityOverview({ picked, holidays, onPickDay, onPickSlot }: CapacityOverviewProps) {
  const today = todayIso()
  const [day, setDay] = useState(picked.date || today)
  const [monday, setMonday] = useState(() => mondayOf(day))
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

  function choose(d: string) {
    setDay(d)
    onPickDay(d)
  }

  return (
    <section className={styles.overview} aria-labelledby="capacity-heading">
      <div className={styles.header}>
        <h2 id="capacity-heading">
          KW {isoWeek(monday)} <span className="muted">· {formatDate(monday).slice(0, 6)}–{formatDate(addDays(monday, 4))}</span>
        </h2>
        <div className={styles.nav}>
          <Button small variant="ghost" icon={ChevronLeft} onClick={() => setMonday(addDays(monday, -7))} aria-label="Vorherige Woche" />
          <Button small variant="ghost" onClick={() => setMonday(mondayOf(today))}>
            Heute
          </Button>
          <Button small variant="ghost" icon={ChevronRight} onClick={() => setMonday(addDays(monday, 7))} aria-label="Nächste Woche" />
        </div>
      </div>
      {week.error && <p className="muted">Termine konnten nicht geladen werden: {week.error.message}</p>}

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
        />
      ) : (
        <p className="muted">Lade Termine …</p>
      )}
      <p className={styles.legend}>Im Raster ziehen übernimmt Lift, Beginn und Ende – tippen eine Stunde.</p>
    </section>
  )
}
