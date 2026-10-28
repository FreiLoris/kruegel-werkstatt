import { useEffect, useState } from 'react'

/** What counts as using the device: mouse, keyboard, finger, scrolling */
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

/**
 * Locked after `minutes` without use (FB-29) – the page stays as it is underneath. `minutes` 0 or
 * `enabled` false: never. A device that was asleep (laptop closed) counts the time it slept too.
 */
export function useIdleLock(minutes: number, enabled: boolean): { locked: boolean; unlock: () => void } {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!enabled || minutes <= 0 || locked) return
    const limit = minutes * 60_000
    let lastUse = Date.now()
    const used = () => {
      lastUse = Date.now()
    }
    ACTIVITY.forEach((event) => window.addEventListener(event, used, { passive: true, capture: true }))
    // checked every few seconds instead of one long timer: a timer stops while the device sleeps
    const check = window.setInterval(() => {
      if (Date.now() - lastUse >= limit) setLocked(true)
    }, 5_000)
    return () => {
      ACTIVITY.forEach((event) => window.removeEventListener(event, used, { capture: true }))
      window.clearInterval(check)
    }
  }, [minutes, enabled, locked])

  // not locked any more when the lock is switched off (e.g. the device became "Nur ansehen")
  const shownLocked = locked && enabled && minutes > 0
  return { locked: shownLocked, unlock: () => setLocked(false) }
}
