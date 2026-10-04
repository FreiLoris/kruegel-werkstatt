import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { onDataChanged } from './liveEvent'

export type LiveStatus = 'connecting' | 'connected' | 'disconnected'

const FIRST_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000

/**
 * Keeps the live connection to the server (Server-Sent Events) and reloads changed data.
 * Used exactly once in the app (AppLayout).
 *
 * Reconnecting: `EventSource` only reconnects on its own after pure network errors.
 * If nginx answers with an error instead (e.g. 502 while the backend restarts after an
 * update), `EventSource` gives up for good. In that case we reconnect ourselves – with a
 * growing delay (1 s, 2 s, 4 s … max. 30 s) so as not to flood the server.
 */
export function useLiveUpdates(): LiveStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    let source: EventSource | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let delay = FIRST_DELAY_MS
    let wasConnected = false
    let stopped = false

    function connect() {
      source = new EventSource('/api/live')

      source.addEventListener('connected', () => {
        // After an interruption changes may have been missed → reload everything.
        if (wasConnected) {
          void queryClient.invalidateQueries()
        }
        wasConnected = true
        delay = FIRST_DELAY_MS
        setStatus('connected')
      })

      source.addEventListener('change', (event) => {
        onDataChanged((event as MessageEvent<string>).data, queryClient)
      })

      source.addEventListener('error', () => {
        setStatus('disconnected')
        if (source?.readyState === EventSource.CLOSED && !stopped) {
          reconnectTimer = setTimeout(connect, delay)
          delay = Math.min(delay * 2, MAX_DELAY_MS)
        }
      })
    }

    connect()

    return () => {
      stopped = true
      clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [queryClient])

  return status
}
