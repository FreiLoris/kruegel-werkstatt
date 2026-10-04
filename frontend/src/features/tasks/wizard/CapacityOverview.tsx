import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { isoWeek, isWeekend, mondayOf, weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { addDays, formatDate, formatTime, todayIso } from '../../../lib/format'
import { useTasksBetween, type Task } from '../taskApi'
import styles from './CapacityOverview.module.css'

/** Planning grid 07:00–17:30 in half hours, like the old app – a planning aid, not a capacity check. */
const FIRST_SLOT = 7 * 60
const LAST_SLOT = 17 * 60
const SLOT_MINUTES = 30
const SLOTS = Array.from({ length: (LAST_SLOT - FIRST_SLOT) / SLOT_MINUTES + 1 }, (_, i) => FIRST_SLOT + i * SLOT_MINUTES)

const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** Slot in which a task appears – earlier/later ones at the edge of the grid. */
function slotOf(time: string): number {
  const minutes = Math.min(Math.max(toMinutes(time), FIRST_SLOT), LAST_SLOT)
  return FIRST_SLOT + Math.floor((minutes - FIRST_SLOT) / SLOT_MINUTES) * SLOT_MINUTES
}

interface CapacityOverviewProps {
  date: string
  time: string
  /** date → holiday name */
  holidays: ReadonlyMap<string, string>
  onPick: (date: string, time: string) => void
}

/**
 * Week overview of all tasks (UI review: sticky, equal headers, "0 Termine" instead of "0T",
 * a click on a slot takes over date and time). Weekends only appear when there are tasks.
 */
export function CapacityOverview({ date, time, holidays, onPick }: CapacityOverviewProps) {
  const today = todayIso()
  const [monday, setMonday] = useState(() => mondayOf(date || today))
  // A date typed in the form shows its week ("adjust state while rendering", no effect needed)
  const [shownFor, setShownFor] = useState(date)
  if (date !== shownFor) {
    setShownFor(date)
    if (date) setMonday(mondayOf(date))
  }

  const sunday = addDays(monday, 6)
  const tasks = useTasksBetween(monday, sunday)
  const byDay = new Map<string, Task[]>()
  for (const task of tasks.data ?? []) {
    byDay.set(task.date, [...(byDay.get(task.date) ?? []), task])
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (day) => !isWeekend(day) || byDay.has(day) || day === date,
  )
  const selectedSlot = date && time ? slotOf(time) : null

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
      {tasks.error && <p className="muted">Termine konnten nicht geladen werden: {tasks.error.message}</p>}

      <div className={styles.grid} style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className={styles.corner} />
        {days.map((day) => {
          const count = byDay.get(day)?.length ?? 0
          const holiday = holidays.get(day)
          return (
            <div
              key={day}
              className={[styles.dayHeader, day === today && styles.today, day === date && styles.selectedDay, holiday && styles.holiday]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.dayName}>
                {WEEKDAYS_SHORT[weekdayOf(day)]} {formatDate(day).slice(0, 6)}
              </span>
              <span className={styles.dayInfo}>{holiday ?? (count === 1 ? '1 Termin' : `${count} Termine`)}</span>
            </div>
          )
        })}

        {SLOTS.map((slot) => (
          <Row
            key={slot}
            slot={slot}
            days={days}
            byDay={byDay}
            holidays={holidays}
            selected={(day) => day === date && slot === selectedSlot}
            onPick={onPick}
          />
        ))}
      </div>
      <p className={styles.legend}>Klick auf ein Feld übernimmt Datum und Uhrzeit.</p>
    </section>
  )
}

function Row({
  slot,
  days,
  byDay,
  holidays,
  selected,
  onPick,
}: {
  slot: number
  days: string[]
  byDay: Map<string, Task[]>
  holidays: ReadonlyMap<string, string>
  selected: (day: string) => boolean
  onPick: (date: string, time: string) => void
}) {
  const time = toTime(slot)
  return (
    <>
      <div className={[styles.time, slot % 60 === 0 && styles.fullHour].filter(Boolean).join(' ')}>{slot % 60 === 0 ? time : ''}</div>
      {days.map((day) => {
        const here = (byDay.get(day) ?? []).filter((task) => slotOf(task.time) === slot)
        return (
          <button
            key={day}
            type="button"
            className={[styles.cell, slot % 60 === 0 && styles.fullHour, holidays.has(day) && styles.holidayCell, selected(day) && styles.selectedCell]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onPick(day, time)}
            aria-label={`${WEEKDAYS_SHORT[weekdayOf(day)]} ${formatDate(day)} ${time} wählen${here.length ? `, ${here.length} Termin(e)` : ''}`}
            aria-pressed={selected(day)}
          >
            {here.map((task) => (
              <span
                key={task.id}
                className={styles.chip}
                title={[formatTime(task.time), task.customer.displayName, task.vehicle?.licensePlate, task.vehicle?.description]
                  .filter(Boolean)
                  .join(' · ')}
              >
                {formatTime(task.time)} {task.customer.displayName}
              </span>
            ))}
          </button>
        )
      })}
    </>
  )
}
