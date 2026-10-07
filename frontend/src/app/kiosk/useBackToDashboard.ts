import { useEffect } from 'react'
import { useNavigate } from 'react-router'

/** On the TV: this long without touch, mouse or keys on another page → back to the dashboard */
export const IDLE_MS = 2 * 60_000

const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * The workshop TV (10c, F5): someone taps an appointment and walks away – the TV would show that
 * task all day. After {@link IDLE_MS} without activity it returns to the dashboard by itself.
 */
export function useBackToDashboard(active: boolean) {
  const navigate = useNavigate()
  useEffect(() => {
    if (!active) return
    let timer = window.setTimeout(back, IDLE_MS)
    function back() {
      navigate('/', { replace: true })
    }
    function restart() {
      window.clearTimeout(timer)
      timer = window.setTimeout(back, IDLE_MS)
    }
    ACTIVITY.forEach((type) => window.addEventListener(type, restart, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      ACTIVITY.forEach((type) => window.removeEventListener(type, restart))
    }
  }, [active, navigate])
}
