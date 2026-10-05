import { addMinutes, minutesBetween } from '../../../lib/format'
import type { Task } from '../taskApi'

/**
 * The time grid of a day (6k): pure calculations in minutes since midnight – what the components
 * draw and what a drag turns into. Tested without rendering anything.
 */

/** Everything snaps to quarter hours – start, end and new tasks */
export const SNAP_MINUTES = 15
/** Usual working day shown even when it is empty; earlier/later tasks widen it to full hours */
export const WORKDAY_START = 7 * 60
export const WORKDAY_END = 18 * 60
const DAY = 24 * 60

/** "08:30" or "08:30:00" → 510 */
export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}

/** 510 → "08:30"; 1440 is the end of the day ("24:00" would not be a valid time) */
export function timeOf(minutes: number): string {
  const m = Math.min(Math.max(minutes, 0), DAY - 1)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** To the nearest quarter hour */
export function snap(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

/** Part of a task on one day: from/to in minutes, and whether it goes on before/after the day. */
export interface Span {
  start: number
  end: number
  startsBefore: boolean
  endsAfter: boolean
}

export function spanOn(task: Task, date: string): Span {
  const endDate = task.endAt.slice(0, 10)
  const startsBefore = task.date < date
  const endsAfter = endDate > date
  return {
    start: startsBefore ? 0 : minutesOf(task.time),
    end: endsAfter ? DAY : minutesOf(task.endAt.slice(11)),
    startsBefore,
    endsAfter,
  }
}

/** Shown hours: the working day, widened to full hours for tasks starting earlier or ending later that day. */
export function visibleRange(tasks: Task[], date: string): { start: number; end: number } {
  let start = WORKDAY_START
  let end = WORKDAY_END
  for (const task of tasks) {
    const span = spanOn(task, date)
    if (!span.startsBefore) start = Math.min(start, Math.floor(span.start / 60) * 60)
    if (!span.endsAfter) end = Math.max(end, Math.ceil(span.end / 60) * 60)
  }
  return { start, end }
}

/** A task placed in its column: lanes side by side where tasks overlap ("Ohne Lift" may overlap). */
export interface Placed extends Span {
  task: Task
  lane: number
  lanes: number
}

/**
 * Lanes like in a calendar: overlapping tasks form a group; each task takes the first free lane,
 * all of a group share the width.
 */
export function placeInColumn(tasks: Task[], date: string): Placed[] {
  const spans = tasks
    .map((task) => ({ task, ...spanOn(task, date) }))
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const placed: Placed[] = []
  let group: Placed[] = []
  let groupEnd = -1
  const closeGroup = () => {
    const lanes = Math.max(0, ...group.map((p) => p.lane)) + 1
    for (const p of group) p.lanes = lanes
    group = []
  }
  for (const span of spans) {
    if (span.start >= groupEnd) closeGroup()
    const laneEnds = new Map<number, number>()
    for (const p of group) laneEnds.set(p.lane, Math.max(laneEnds.get(p.lane) ?? 0, p.end))
    let lane = 0
    while ((laneEnds.get(lane) ?? -1) > span.start) lane++
    const p: Placed = { ...span, lane, lanes: 1 }
    group.push(p)
    placed.push(p)
    groupEnd = Math.max(groupEnd, span.end)
  }
  closeGroup()
  return placed
}

/** What the server gets for a new place of a task: `PUT /api/tasks/{id}/schedule` */
export interface Schedule {
  liftId: string | null
  date: string
  time: string
  endAt: string
}

const startOf = (task: Task) => `${task.date}T${task.time.slice(0, 5)}`

/** Duration in minutes – also over several days */
export function durationOf(task: Task): number {
  return minutesBetween(startOf(task), task.endAt.slice(0, 16))
}

/** The task moved to another start (and lift) – same duration, also when it then ends on another day. */
export function movedTo(task: Task, liftId: string | null, date: string, start: number): Schedule {
  const begin = `${date}T${timeOf(start)}`
  return { liftId, date, time: timeOf(start), endAt: addMinutes(begin, durationOf(task)) }
}

/** The end dragged to {@code end} minutes of {@code date} – at least one quarter hour after the start. */
export function resizedTo(task: Task, date: string, end: number): Schedule {
  const atLeast = addMinutes(startOf(task), SNAP_MINUTES)
  const wanted = addMinutes(`${date}T00:00`, end)
  return { liftId: task.liftId, date: task.date, time: task.time.slice(0, 5), endAt: wanted < atLeast ? atLeast : wanted }
}

/** A dragged-open area in the empty grid → start and end of a new task; a mere click = the default hour. */
export function selection(date: string, from: number, to: number): { date: string; time: string; endAt: string } {
  const start = Math.min(from, to)
  const end = Math.abs(to - from) < SNAP_MINUTES ? start + 60 : Math.max(from, to)
  return { date, time: timeOf(start), endAt: addMinutes(`${date}T00:00`, end) }
}

/** The task with the new place – shown right away while the server saves */
export function withSchedule(tasks: Task[], id: string, schedule: Schedule): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) return task
    const days = minutesBetween(`${task.date}T00:00`, `${schedule.date}T00:00`) / DAY
    const shift = (dateTime: string | null) => dateTime && `${addMinutes(dateTime.slice(0, 16), days * DAY)}:00`
    return {
      ...task,
      liftId: schedule.liftId,
      date: schedule.date,
      time: `${schedule.time}:00`,
      endAt: `${schedule.endAt}:00`,
      arrivesEarlier: shift(task.arrivesEarlier),
      readyBy: shift(task.readyBy),
    }
  })
}

/** The task in the column that [start, end) would overlap (except the one being moved) – lifts take one car at a time. */
export function blockingIn(placed: Placed[], start: number, end: number, exceptId?: string): Placed | undefined {
  return placed.find((p) => p.task.id !== exceptId && p.start < end && start < p.end)
}
