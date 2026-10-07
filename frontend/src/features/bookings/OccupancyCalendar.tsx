import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useToday } from '../../lib/clock'
import { isWeekend, weekdayOf, WEEKDAYS_SHORT } from '../../lib/calendar'
import { addDays, formatDate, formatLocalDateTime, minutesBetween } from '../../lib/format'
import type { CourtesyCar } from '../courtesy-cars/courtesyCarApi'
import type { Booking } from './bookingApi'
import styles from './OccupancyCalendar.module.css'
import { barsOf, type Bar } from './occupancy'

const DAY = 24 * 60
/** Finger: hold this long before a drag starts (moving earlier = scrolling), as in the day view */
const HOLD_MS = 350
/** Mouse: moving less than this is a click, not a drag */
const CLICK_TOLERANCE_PX = 6

interface OccupancyCalendarProps {
  /** cars in service, in their order */
  cars: CourtesyCar[]
  bookings: Booking[]
  /** first day shown */
  from: string
  days: number
  /** "2026-10-15T10:00" – Swiss time */
  now: string
  /** date → holiday name */
  holidays: ReadonlyMap<string, string>
  canEdit: boolean
  /** days dragged open (or tapped) in a car's row */
  onSelect: (courtesyCarId: string, fromDay: string, toDay: string) => void
  /** a bar clicked – show it in the panel */
  onOpen: (booking: Booking) => void
  /** a booking not picked up yet dragged to another day and/or car */
  onMove: (booking: Booking, courtesyCarId: string, days: number) => void
  /** dropped where the car is visibly taken – nothing is sent */
  onBlocked: (message: string) => void
  /** the booking shown in the panel */
  selectedId?: string
}

type Gesture =
  | { kind: 'select'; carId: string; from: number; to: number; pointerId: number; touch: boolean; held: boolean; startX: number; startY: number }
  | {
      kind: 'move'
      bar: Bar
      carId: string
      targetCarId: string
      dx: number
      /** width of one day in pixels when the drag started – the calendar fills the page */
      dayWidth: number
      pointerId: number
      touch: boolean
      held: boolean
      dragged: boolean
      startX: number
      startY: number
    }

/**
 * Occupancy calendar (7d, bug #2 / F12): one row per car, one column per day, bookings as bars
 * from pickup to return. Drag open free days = new booking (the period can then be changed in
 * the panel), drag a bar = other day or car, click a bar = details. A finger holds briefly first.
 */
export function OccupancyCalendar({
  cars,
  bookings,
  from,
  days,
  now,
  holidays,
  canEdit,
  onSelect,
  onOpen,
  onMove,
  onBlocked,
  selectedId,
}: OccupancyCalendarProps) {
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const holdTimer = useRef<number | undefined>(undefined)
  const today = useToday()
  const dayList = Array.from({ length: days }, (_, i) => addDays(from, i))
  const nowOffset = minutesBetween(`${from}T00:00`, now)
  const barsFor = (carId: string) =>
    barsOf(
      bookings.filter((b) => b.courtesyCarId === carId),
      from,
      days,
      now,
    )

  // a finger dragging must not scroll the page (touch-action cannot change mid-gesture)
  const fingerHolds = gesture?.touch === true && gesture.held
  useEffect(() => {
    if (!fingerHolds) return
    const stop = (e: TouchEvent) => e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    return () => document.removeEventListener('touchmove', stop)
  }, [fingerHolds])
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  function armHold(pointerId: number) {
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      setGesture((g) => (g && g.pointerId === pointerId ? { ...g, held: true } : g))
      navigator.vibrate?.(15)
    }, HOLD_MS)
  }

  function cancel() {
    window.clearTimeout(holdTimer.current)
    setGesture(null)
  }

  const total = days * DAY
  /** position in the row as percentage – the calendar is as wide as the page */
  const pct = (minutes: number) => `${(minutes / total) * 100}%`
  const dayIndexAt = (clientX: number, track: Element) => {
    const rect = track.getBoundingClientRect()
    return Math.min(Math.max(Math.floor(((clientX - rect.left) / rect.width) * days), 0), days - 1)
  }

  // ── dragging open free days ─────────────────────────────────────

  function startSelect(e: PointerEvent<HTMLDivElement>, carId: string) {
    if (e.target !== e.currentTarget || e.button !== 0 || !canEdit) return
    const index = dayIndexAt(e.clientX, e.currentTarget)
    const touch = e.pointerType === 'touch'
    if (touch) armHold(e.pointerId)
    else e.currentTarget.setPointerCapture(e.pointerId)
    setGesture({ kind: 'select', carId, from: index, to: index, pointerId: e.pointerId, touch, held: !touch, startX: e.clientX, startY: e.clientY })
  }

  function moveSelect(e: PointerEvent<HTMLDivElement>) {
    if (gesture?.kind !== 'select' || e.pointerId !== gesture.pointerId) return
    if (!gesture.held) {
      if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > CLICK_TOLERANCE_PX) cancel()
      return
    }
    const to = dayIndexAt(e.clientX, e.currentTarget)
    if (to !== gesture.to) setGesture({ ...gesture, to })
  }

  function endSelect(e: PointerEvent<HTMLDivElement>) {
    window.clearTimeout(holdTimer.current)
    if (gesture?.kind !== 'select' || e.pointerId !== gesture.pointerId) return
    const to = gesture.held ? dayIndexAt(e.clientX, e.currentTarget) : gesture.from
    setGesture(null)
    onSelect(gesture.carId, dayList[gesture.from], dayList[to])
  }

  // ── dragging a bar ──────────────────────────────────────────────

  function startMove(e: PointerEvent<HTMLDivElement>, bar: Bar) {
    if (e.button !== 0) return
    const touch = e.pointerType === 'touch'
    const movable = canEdit && bar.state === 'planned'
    if (movable && touch) armHold(e.pointerId)
    else if (movable) e.currentTarget.setPointerCapture(e.pointerId)
    const carId = bar.booking.courtesyCarId
    setGesture({
      kind: 'move',
      bar,
      carId,
      targetCarId: carId,
      dx: 0,
      dayWidth: (e.currentTarget.parentElement?.getBoundingClientRect().width ?? days) / days,
      pointerId: e.pointerId,
      touch,
      held: movable && !touch,
      dragged: false,
      startX: e.clientX,
      startY: e.clientY,
    })
  }

  function moveBar(e: PointerEvent<HTMLDivElement>) {
    if (gesture?.kind !== 'move' || e.pointerId !== gesture.pointerId) return
    const dx = e.clientX - gesture.startX
    const far = Math.hypot(dx, e.clientY - gesture.startY) > CLICK_TOLERANCE_PX
    if (!gesture.held) {
      if (far) cancel() // a finger that moves before holding scrolls
      return
    }
    if (!far && !gesture.dragged) return
    const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-car-row]')
    setGesture({ ...gesture, dx, dragged: true, targetCarId: row?.dataset.carRow ?? gesture.targetCarId })
  }

  function endMove(e: PointerEvent<HTMLDivElement>) {
    window.clearTimeout(holdTimer.current)
    if (gesture?.kind !== 'move' || e.pointerId !== gesture.pointerId) return
    setGesture(null)
    if (!gesture.dragged) {
      onOpen(gesture.bar.booking)
      return
    }
    const shift = Math.round(gesture.dx / gesture.dayWidth)
    if (shift === 0 && gesture.targetCarId === gesture.carId) return
    const { bar } = gesture
    if (overlaps(barsFor(gesture.targetCarId), bar.start + shift * DAY, bar.end + shift * DAY, bar.booking.id)) {
      onBlocked(`${cars.find((c) => c.id === gesture.targetCarId)?.name} ist in dieser Zeit belegt.`)
      return
    }
    onMove(bar.booking, gesture.targetCarId, shift)
  }

  function openByKey(e: KeyboardEvent, booking: Booking) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(booking)
    }
  }

  /** The outline of a drag in a car's row – red where it would collide */
  function ghostIn(carId: string, bars: Bar[]) {
    if (gesture?.kind === 'select' && gesture.held && gesture.carId === carId) {
      const first = Math.min(gesture.from, gesture.to)
      const last = Math.max(gesture.from, gesture.to)
      const start = first * DAY + 8 * 60
      const end = last * DAY + 17 * 60
      return { start, end, label: `${formatDate(dayList[first]).slice(0, 6)} – ${formatDate(dayList[last]).slice(0, 6)}`, taken: overlaps(bars, start, end) }
    }
    if (gesture?.kind === 'move' && gesture.dragged && gesture.targetCarId === carId) {
      const shift = Math.round(gesture.dx / gesture.dayWidth) * DAY
      const start = gesture.bar.start + shift
      const end = gesture.bar.end + shift
      const moved = addDays(gesture.bar.booking.pickupAt.slice(0, 10), shift / DAY)
      return { start, end, label: `ab ${formatDate(moved).slice(0, 6)}`, taken: overlaps(bars, start, end, gesture.bar.booking.id) }
    }
    return null
  }

  return (
    <div className={styles.scroller}>
      <div className={styles.grid} style={{ '--days': days } as CSSProperties}>
        <div className={styles.corner}>Fahrzeug</div>
        <div className={styles.days}>
          {dayList.map((d) => (
            <div
              key={d}
              className={[styles.day, d === today && styles.today, (isWeekend(d) || holidays.has(d)) && styles.off].filter(Boolean).join(' ')}
              title={holidays.get(d)}
            >
              <span className={styles.weekday}>{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
              <span>{formatDate(d).slice(0, 6)}</span>
            </div>
          ))}
        </div>

        {cars.map((car) => {
          const bars = barsFor(car.id)
          const ghost = ghostIn(car.id, bars)
          return (
            <div key={car.id} className={styles.row}>
              <div className={styles.car}>
                <strong className={styles.carName}>{car.name}</strong>
                <span className={styles.carMeta}>{car.licensePlate ?? car.model}</span>
              </div>
              <div
                className={[styles.track, canEdit && styles.creatable].filter(Boolean).join(' ')}
                data-car-row={car.id}
                onPointerDown={(e) => startSelect(e, car.id)}
                onPointerMove={moveSelect}
                onPointerUp={endSelect}
                onPointerCancel={cancel}
                onContextMenu={(e) => e.preventDefault()}
              >
                {dayList.map((d, i) =>
                  isWeekend(d) || holidays.has(d) ? (
                    <div key={d} className={styles.offDay} style={{ left: pct(i * DAY), width: pct(DAY) }} aria-hidden />
                  ) : null,
                )}
                {bars.map((bar) => (
                  <div
                    key={bar.booking.id}
                    role="button"
                    tabIndex={0}
                    className={[
                      styles.bar,
                      styles[bar.state],
                      bar.continuesBefore && styles.before,
                      bar.continuesAfter && styles.after,
                      bar.booking.id === selectedId && styles.selected,
                      gesture?.kind === 'move' && gesture.dragged && gesture.bar.booking.id === bar.booking.id && styles.dimmed,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ left: pct(bar.start), width: pct(bar.end - bar.start) }}
                    title={`${bar.booking.holderName}: ${formatLocalDateTime(bar.booking.pickupAt)} – ${formatLocalDateTime(bar.booking.returnAt)}`}
                    aria-label={`${car.name}, ${bar.booking.holderName}, ${formatLocalDateTime(bar.booking.pickupAt)} bis ${formatLocalDateTime(bar.booking.returnAt)}`}
                    onPointerDown={(e) => startMove(e, bar)}
                    onPointerMove={moveBar}
                    onPointerUp={endMove}
                    onPointerCancel={cancel}
                    onKeyDown={(e) => openByKey(e, bar.booking)}
                    // screen readers "click" without a pointer (detail 0) – pointer clicks are handled above
                    onClick={(e) => e.detail === 0 && onOpen(bar.booking)}
                  >
                    <span className={styles.barText}>{bar.booking.holderName}</span>
                  </div>
                ))}
                {ghost && (
                  <div
                    className={[styles.ghost, ghost.taken && styles.taken].filter(Boolean).join(' ')}
                    style={{ left: pct(ghost.start), width: pct(ghost.end - ghost.start) }}
                    aria-hidden
                  >
                    {ghost.label}
                    {ghost.taken && ' · belegt'}
                  </div>
                )}
                {nowOffset >= 0 && nowOffset <= total && <div className={styles.now} style={{ left: pct(nowOffset) }} aria-hidden />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Would [start, end) overlap another bar of the row (except the one being moved)? Returned ones end at their return. */
function overlaps(bars: Bar[], start: number, end: number, exceptId?: string): boolean {
  return bars.some((b) => b.booking.id !== exceptId && b.start < end && start < b.end)
}
