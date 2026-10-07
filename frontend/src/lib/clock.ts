import { useSyncExternalStore } from 'react'
import { nowTimeIso, todayIso } from './format'

/**
 * ONE clock for the whole app (10c, bug #15: the old date at the top never moved on). It ticks at
 * every full minute; every page that shows "today" or "now" reads it and re-renders when it
 * changes – also over midnight on the TV or a tablet that is never reloaded. Queries with the
 * date in their key then load the new day by themselves.
 *
 * Only one timer runs, and only while something listens.
 */

/** Swiss business time: today ("2026-10-15") and the minute ("08:05") */
export interface Clock {
  today: string
  time: string
}

let current: Clock = read()
const listeners = new Set<() => void>()
let timer: number | undefined

function read(now: Date = new Date()): Clock {
  return { today: todayIso(now), time: nowTimeIso(now) }
}

/** Milliseconds until the next full minute (+ a little, so the minute has surely changed) */
export function untilNextMinute(now: Date): number {
  return 60_000 - (now.getTime() % 60_000) + 50
}

function tick() {
  const next = read()
  // a new object only when something changed – useSyncExternalStore re-renders on a new snapshot
  if (next.today !== current.today || next.time !== current.time) {
    current = next
    listeners.forEach((listener) => listener())
  }
  timer = window.setTimeout(tick, untilNextMinute(new Date()))
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    current = read()
    timer = window.setTimeout(tick, untilNextMinute(new Date()))
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.clearTimeout(timer)
  }
}

const snapshot = () => current

/** Today and the current minute – both keep themselves up to date */
export function useClock(): Clock {
  return useSyncExternalStore(subscribe, snapshot)
}

/** Today ("2026-10-15") – changes at midnight without reloading */
export function useToday(): string {
  return useClock().today
}
