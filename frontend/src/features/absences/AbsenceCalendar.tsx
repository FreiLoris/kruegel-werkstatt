import { Cake } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { isWeekend, weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { formatDate } from '../../lib/format'
import type { Employee } from '../employees/employeeApi'
import { NameBadge } from '../employees/NameBadge'
import { ABSENCE_CATEGORY, type Absence } from './absenceApi'
import styles from './AbsenceCalendar.module.css'
import { barsOf, isBirthday, overlapsAny, selectedDays, type AbsenceBar } from './absenceMonth'
import { CATEGORY_CLASS } from './categoryColors'

/** Finger: hold this long before a drag starts (moving earlier = scrolling), as in the other calendars */
const HOLD_MS = 350
/** Moving less than this before holding is a tap, not a scroll */
const CLICK_TOLERANCE_PX = 6

interface AbsenceCalendarProps {
  /** one row each, in this order */
  employees: Employee[]
  absences: Absence[]
  /** the days shown, e.g. a month */
  days: string[]
  today: string
  /** date → holiday name */
  holidays: ReadonlyMap<string, string>
  canEdit: boolean
  /** days dragged open (or tapped) in a person's row */
  onSelect: (employeeId: string, startDate: string, endDate: string) => void
  /** a bar clicked */
  onOpen: (absence: Absence) => void
}

interface Selection {
  employeeId: string
  from: number
  to: number
  pointerId: number
  touch: boolean
  held: boolean
  startX: number
  startY: number
}

/**
 * Employee calendar (9b): one row per person, one column per day – all days the same width – and
 * each absence as ONE bar over its period (the old one had a box per day, cut to "Ferie"). Half
 * days are half columns. Weekends and holidays are grey. Drag open days = enter an absence.
 */
export function AbsenceCalendar({ employees, absences, days, today, holidays, canEdit, onSelect, onOpen }: AbsenceCalendarProps) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const holdTimer = useRef<number | undefined>(undefined)
  const from = days[0]
  const halves = days.length * 2
  /** position in the row as percentage – the calendar is as wide as the page */
  const pct = (half: number) => `${(half / halves) * 100}%`

  // a finger dragging must not scroll the page (touch-action cannot change mid-gesture)
  const fingerHolds = selection?.touch === true && selection.held
  useEffect(() => {
    if (!fingerHolds) return
    const stop = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [fingerHolds])
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  function cancel() {
    window.clearTimeout(holdTimer.current)
    setSelection(null)
  }

  const dayIndexAt = (clientX: number, track: Element) => {
    const rect = track.getBoundingClientRect()
    return Math.min(Math.max(Math.floor(((clientX - rect.left) / rect.width) * days.length), 0), days.length - 1)
  }

  function start(e: PointerEvent<HTMLDivElement>, employeeId: string) {
    if (e.target !== e.currentTarget || e.button !== 0 || !canEdit) return
    const index = dayIndexAt(e.clientX, e.currentTarget)
    const touch = e.pointerType === 'touch'
    if (touch) {
      const pointerId = e.pointerId
      window.clearTimeout(holdTimer.current)
      holdTimer.current = window.setTimeout(() => {
        setSelection((s) => (s && s.pointerId === pointerId ? { ...s, held: true } : s))
        navigator.vibrate?.(15)
      }, HOLD_MS)
    } else {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setSelection({ employeeId, from: index, to: index, pointerId: e.pointerId, touch, held: !touch, startX: e.clientX, startY: e.clientY })
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!selection || e.pointerId !== selection.pointerId) return
    if (!selection.held) {
      // a finger that moves before holding scrolls
      if (Math.hypot(e.clientX - selection.startX, e.clientY - selection.startY) > CLICK_TOLERANCE_PX) cancel()
      return
    }
    const to = dayIndexAt(e.clientX, e.currentTarget)
    if (to !== selection.to) setSelection({ ...selection, to })
  }

  function end(e: PointerEvent<HTMLDivElement>) {
    window.clearTimeout(holdTimer.current)
    if (!selection || e.pointerId !== selection.pointerId) return
    // a tap (finger not held) = just that day
    const to = selection.held ? dayIndexAt(e.clientX, e.currentTarget) : selection.from
    setSelection(null)
    const period = selectedDays(days[selection.from], days[to])
    onSelect(selection.employeeId, period.startDate, period.endDate)
  }

  /** The outline while dragging – red where the person is already away */
  function ghostIn(employeeId: string, bars: AbsenceBar[]) {
    if (!selection?.held || selection.employeeId !== employeeId) return null
    const first = Math.min(selection.from, selection.to)
    const last = Math.max(selection.from, selection.to)
    const label = first === last ? formatDate(days[first]).slice(0, 6) : `${formatDate(days[first]).slice(0, 6)} – ${formatDate(days[last]).slice(0, 6)}`
    return { start: first * 2, end: last * 2 + 2, label, taken: overlapsAny(bars, first * 2, last * 2 + 2) }
  }

  return (
    <div className={styles.scroller}>
      <div className={styles.grid} style={{ '--days': days.length } as CSSProperties}>
        <div className={styles.corner}>Person</div>
        <div className={styles.days}>
          {days.map((d) => (
            <div
              key={d}
              className={[styles.day, d === today && styles.today, (isWeekend(d) || holidays.has(d)) && styles.off].filter(Boolean).join(' ')}
              title={holidays.get(d)}
            >
              <span className={styles.weekday}>{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
              <span>{Number(d.slice(8))}</span>
            </div>
          ))}
        </div>

        {employees.map((employee) => {
          const bars = barsOf(
            absences.filter((a) => a.employeeId === employee.id),
            from,
            days.length,
          )
          const ghost = ghostIn(employee.id, bars)
          return (
            <div key={employee.id} className={styles.row}>
              <div className={styles.person}>
                <NameBadge name={employee.name} color={employee.color} />
              </div>
              <div
                className={[styles.track, canEdit && styles.creatable].filter(Boolean).join(' ')}
                onPointerDown={(e) => start(e, employee.id)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={cancel}
                onContextMenu={(e) => e.preventDefault()}
              >
                {days.map((d, i) => {
                  const off = isWeekend(d) || holidays.has(d)
                  if (!off && d !== today) return null
                  return <div key={d} className={off ? styles.offDay : styles.todayDay} style={{ left: pct(i * 2), width: pct(2) }} aria-hidden />
                })}
                {days.map((d, i) =>
                  isBirthday(employee.birthday, d) ? (
                    <span key={`birthday-${d}`} className={styles.birthday} style={{ left: pct(i * 2), width: pct(2) }}>
                      <Cake size={14} aria-hidden />
                      <span className="visually-hidden">Geburtstag {employee.name}</span>
                    </span>
                  ) : null,
                )}
                {bars.map((bar) => (
                  <button
                    key={bar.absence.id}
                    type="button"
                    className={[styles.bar, CATEGORY_CLASS[bar.absence.category], bar.continuesBefore && styles.before, bar.continuesAfter && styles.after]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ left: pct(bar.start), width: pct(bar.end - bar.start) }}
                    title={describe(employee.name, bar.absence)}
                    aria-label={describe(employee.name, bar.absence)}
                    onClick={() => onOpen(bar.absence)}
                  >
                    <span className={styles.barText}>{labelOf(bar.absence)}</span>
                  </button>
                ))}
                {ghost && (
                  <div
                    className={[styles.ghost, ghost.taken && styles.taken].filter(Boolean).join(' ')}
                    style={{ left: pct(ghost.start), width: pct(ghost.end - ghost.start) }}
                    aria-hidden
                  >
                    {ghost.label}
                    {ghost.taken && ' · schon abwesend'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** "Ferien" / "Fremdarbeit Garage Muster AG" – what stands on the bar */
function labelOf(absence: Absence): string {
  return absence.category === 'EXTERNAL_WORK' && absence.company ? `${ABSENCE_CATEGORY.EXTERNAL_WORK} ${absence.company}` : ABSENCE_CATEGORY[absence.category]
}

/** Everything in words – tooltip and screen reader (the bar itself is often too short) */
function describe(name: string, absence: Absence): string {
  const startPart = absence.startsAfternoon ? ' ab Mittag' : ''
  const endPart = absence.endsNoon ? ' bis Mittag' : ''
  const when =
    absence.startDate === absence.endDate && !absence.startsAfternoon && !absence.endsNoon
      ? formatDate(absence.startDate)
      : `${formatDate(absence.startDate)}${startPart} – ${formatDate(absence.endDate)}${endPart}`
  return [`${name}: ${labelOf(absence)}, ${when}`, absence.note].filter(Boolean).join(' · ')
}
