import { useEffect, useRef } from 'react'

/**
 * FB-29: a "who" field filled with the person of the device follows when another person takes
 * over the device – as long as it was still empty or still that person (not chosen by hand for
 * someone else). `onSwitch(previous, next)` updates the form; `previous` is '' at first.
 */
export function useFollowPerson(me: string | undefined, onSwitch: (previous: string, next: string) => void) {
  const previous = useRef(me)
  const callback = useRef(onSwitch)
  useEffect(() => {
    callback.current = onSwitch
  })

  useEffect(() => {
    if (me && me !== previous.current) callback.current(previous.current ?? '', me)
    previous.current = me
  }, [me])
}

/** The field after a switch: the new person if it was empty or the previous one, else as it was */
export const followed = (value: string, previous: string, next: string) => (value === '' || value === previous ? next : value)
