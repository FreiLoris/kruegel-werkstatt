import { useCallback, useRef } from 'react'

/**
 * A save that runs once at a time (UX G-03): a double click or Enter pressed twice created two
 * records – the button's "loading" only shows after the next render, the second click comes before.
 *
 *   const once = useSingleFlight()
 *   once((done) => save.mutate(request, { onSettled: done, onSuccess: … }))
 *
 * `done` must be called when the save has finished (success or error) – then the next one may run.
 */
export function useSingleFlight(): (action: (done: () => void) => void) => void {
  const running = useRef(false)
  return useCallback((action: (done: () => void) => void) => {
    if (running.current) return
    running.current = true
    action(() => {
      running.current = false
    })
  }, [])
}
