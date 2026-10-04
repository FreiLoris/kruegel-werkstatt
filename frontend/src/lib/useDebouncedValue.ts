import { useEffect, useState } from 'react'

/**
 * The value, but only after it has not changed for `delayMs`.
 * For search fields: one request after typing instead of one per key press.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
