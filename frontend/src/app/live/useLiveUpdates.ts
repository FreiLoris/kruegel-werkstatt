import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { beiAenderung } from './liveEreignis'

export type LiveStatus = 'verbinde' | 'verbunden' | 'getrennt'

const ERSTE_WARTEZEIT_MS = 1_000
const MAX_WARTEZEIT_MS = 30_000

/**
 * Hält die Live-Verbindung zum Server (Server-Sent Events) und lädt geänderte Daten neu.
 * Wird genau einmal in der App verwendet (AppLayout).
 *
 * Neuverbinden: `EventSource` verbindet sich nur bei reinen Netzwerkfehlern von selbst neu.
 * Antwortet stattdessen nginx mit einem Fehler (z. B. 502, während das Backend nach einem
 * Update neu startet), gibt `EventSource` endgültig auf. Darum verbinden wir in diesem Fall
 * selbst neu – mit wachsender Wartezeit (1 s, 2 s, 4 s … max. 30 s), um den Server nicht
 * zu überfluten.
 */
export function useLiveUpdates(): LiveStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('verbinde')

  useEffect(() => {
    let quelle: EventSource | undefined
    let neuVerbindenTimer: ReturnType<typeof setTimeout> | undefined
    let wartezeit = ERSTE_WARTEZEIT_MS
    let warSchonVerbunden = false
    let beendet = false

    function verbinden() {
      quelle = new EventSource('/api/live')

      quelle.addEventListener('verbunden', () => {
        // Nach einer Unterbrechung könnten Änderungen verpasst worden sein → alles neu laden.
        if (warSchonVerbunden) {
          void queryClient.invalidateQueries()
        }
        warSchonVerbunden = true
        wartezeit = ERSTE_WARTEZEIT_MS
        setStatus('verbunden')
      })

      quelle.addEventListener('aenderung', (event) => {
        beiAenderung((event as MessageEvent<string>).data, queryClient)
      })

      quelle.addEventListener('error', () => {
        setStatus('getrennt')
        if (quelle?.readyState === EventSource.CLOSED && !beendet) {
          neuVerbindenTimer = setTimeout(verbinden, wartezeit)
          wartezeit = Math.min(wartezeit * 2, MAX_WARTEZEIT_MS)
        }
      })
    }

    verbinden()

    return () => {
      beendet = true
      clearTimeout(neuVerbindenTimer)
      quelle?.close()
    }
  }, [queryClient])

  return status
}
