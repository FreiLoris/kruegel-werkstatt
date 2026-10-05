import { addDays, addMinutes, minutesBetween } from '../../lib/format'
import type { Booking } from './bookingApi'

/**
 * The courtesy car page (7d) as pure calculations: what state a car is in right now, where the
 * bookings lie in the occupancy calendar, and what a drag turns into. Date-times are compared as
 * "2026-10-15T08:00" (business time, minutes are enough).
 */

const DAY = 24 * 60
/** A booking dragged open over days: picked up in the morning, back in the evening */
export const PICKUP_TIME = '08:00'
export const RETURN_TIME = '17:00'

/** "2026-10-15T08:00:00" → "2026-10-15T08:00" – forms and comparisons work with minutes */
export const minutesOf = (dateTime: string) => dateTime.slice(0, 16)
const minute = minutesOf

/** Where a car is right now – for its card */
export type CarState =
  | { kind: 'overdue'; booking: Booking }
  | { kind: 'out'; booking: Booking }
  | { kind: 'free'; next: Booking | null }

/**
 * Overdue (should be back, is not) beats "out" (picked up, return still ahead) beats "free" –
 * with the next reservation, if there is one. Returned bookings do not count.
 */
export function carState(bookings: Booking[], now: string): CarState {
  const open = bookings.filter((b) => !b.returnedAt).sort((a, b) => a.pickupAt.localeCompare(b.pickupAt))
  const overdue = open.find((b) => minute(b.returnAt) <= now)
  if (overdue) return { kind: 'overdue', booking: overdue }
  const out = open.find((b) => minute(b.pickupAt) <= now)
  if (out) return { kind: 'out', booking: out }
  return { kind: 'free', next: open[0] ?? null }
}

/** planned = not picked up yet; out = on the road; overdue = should be back; returned = back */
export type BarState = 'planned' | 'out' | 'overdue' | 'returned'

/** A booking as a bar in the calendar row of its car, in minutes from the first day 00:00 */
export interface Bar {
  booking: Booking
  start: number
  end: number
  continuesBefore: boolean
  continuesAfter: boolean
  state: BarState
}

/**
 * The bars of [from, from + days): planned period – an early return ends it early, an overdue
 * car stretches it up to now (so it is seen). Bookings outside are left out.
 */
export function barsOf(bookings: Booking[], from: string, days: number, now: string): Bar[] {
  const origin = `${from}T00:00`
  const total = days * DAY
  const bars: Bar[] = []
  for (const booking of bookings) {
    const state: BarState = booking.returnedAt
      ? 'returned'
      : minute(booking.returnAt) <= now
        ? 'overdue'
        : minute(booking.pickupAt) <= now
          ? 'out'
          : 'planned'
    const until = booking.returnedAt ? minute(booking.returnedAt) : state === 'overdue' ? now : minute(booking.returnAt)
    const start = minutesBetween(origin, minute(booking.pickupAt))
    const end = Math.max(minutesBetween(origin, until), start + 30)
    if (end <= 0 || start >= total) continue
    bars.push({
      booking,
      start: Math.max(start, 0),
      end: Math.min(end, total),
      continuesBefore: start < 0,
      continuesAfter: end > total,
      state,
    })
  }
  return bars.sort((a, b) => a.start - b.start)
}

/** Days dragged open in a car's row → pickup in the morning of the first, return in the evening of the last */
export function daySelection(fromDay: string, toDay: string): { pickupAt: string; returnAt: string } {
  const [first, last] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay]
  return { pickupAt: `${first}T${PICKUP_TIME}`, returnAt: `${last}T${RETURN_TIME}` }
}

/** A booking moved by whole days – same times, same length */
export function movedByDays(booking: Booking, days: number): { pickupAt: string; returnAt: string } {
  return { pickupAt: addMinutes(minute(booking.pickupAt), days * DAY), returnAt: addMinutes(minute(booking.returnAt), days * DAY) }
}

/**
 * "Buchen" on a car's card: from the next full hour (at the earliest 08:00) until 17:00 that day –
 * or the next day if that leaves less than an hour. Changeable in the panel anyway (F12).
 */
export function defaultPeriod(now: string): { pickupAt: string; returnAt: string } {
  const day = now.slice(0, 10)
  const nextHour = Math.max(Number(now.slice(11, 13)) + 1, 8)
  if (nextHour >= 16) return { pickupAt: `${addDays(day, 1)}T${PICKUP_TIME}`, returnAt: `${addDays(day, 1)}T${RETURN_TIME}` }
  return { pickupAt: `${day}T${String(nextHour).padStart(2, '0')}:00`, returnAt: `${day}T${RETURN_TIME}` }
}
