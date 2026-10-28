import { useEffect, useState } from 'react'
import { subscribe } from '../../lib/devicePerson'

/** What counts as using the device: mouse, keyboard, finger, scrolling */
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

/** The last use, shared by the tabs of the browser – work in one tab keeps the others open too */
const LAST_USE_KEY = 'workshop.lastUse'
/** Not written on every mouse move */
const WRITE_EVERY_MS = 10_000

function storedLastUse(): number {
  try {
    return Number(localStorage.getItem(LAST_USE_KEY)) || 0
  } catch {
    return 0
  }
}

function storeLastUse(at: number) {
  try {
    localStorage.setItem(LAST_USE_KEY, String(at))
  } catch {
    // private window: each tab counts for itself
  }
}

/**
 * Locked after `minutes` without use (FB-29) – the page stays as it is underneath. `minutes` 0 or
 * `enabled` false: never. A device that was asleep (laptop closed) counts the time it slept too, and
 * is checked the moment it is shown again. A person chosen in another tab unlocks this one too.
 */
export function useIdleLock(minutes: number, enabled: boolean): { locked: boolean; unlock: () => void } {
  const [locked, setLocked] = useState(false)

  // chosen in another tab (or here) – that is someone at the device
  useEffect(() => subscribe(() => setLocked(false)), [])

  useEffect(() => {
    if (!enabled || minutes <= 0 || locked) return
    const limit = minutes * 60_000
    let lastUse = Date.now()
    let written = 0
    storeLastUse(lastUse)
    const used = () => {
      lastUse = Date.now()
      if (lastUse - written >= WRITE_EVERY_MS) {
        written = lastUse
        storeLastUse(lastUse)
      }
    }
    const check = () => {
      if (Date.now() - Math.max(lastUse, storedLastUse()) >= limit) setLocked(true)
    }
    const shown = () => {
      if (document.visibilityState === 'visible') check()
    }
    ACTIVITY.forEach((event) => window.addEventListener(event, used, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', shown)
    // checked every few seconds instead of one long timer: a timer stops while the device sleeps
    const timer = window.setInterval(check, 5_000)
    return () => {
      ACTIVITY.forEach((event) => window.removeEventListener(event, used, { capture: true }))
      document.removeEventListener('visibilitychange', shown)
      window.clearInterval(timer)
    }
  }, [minutes, enabled, locked])

  // not locked any more when the lock is switched off (e.g. the device became "Nur ansehen")
  const shownLocked = locked && enabled && minutes > 0
  return { locked: shownLocked, unlock: () => setLocked(false) }
}
