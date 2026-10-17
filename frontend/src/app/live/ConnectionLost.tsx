import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { nowTimeIso } from '../../lib/format'
import styles from './LiveIndicator.module.css'
import type { LiveStatus } from './useLiveUpdates'

/** A restart of the server takes a few seconds – that should not flash a bar */
export const SHOW_AFTER_MS = 5_000

/**
 * A wide bar when the live connection is lost (UX M-14): the small "Getrennt" pill with its
 * tooltip was overlooked, and the TV then showed an old state for hours without a word.
 */
export function ConnectionLost({ status }: { status: LiveStatus }) {
  const [lostAt, setLostAt] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'disconnected') return
    const at = nowTimeIso()
    const timer = setTimeout(() => setLostAt(at), SHOW_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setLostAt(null)
    }
  }, [status])

  if (!lostAt) return null
  return (
    <div className={styles.lost} role="alert">
      <WifiOff aria-hidden />
      <span>
        <strong>Keine Verbindung zum Server seit {lostAt}.</strong> Die Anzeige kann veraltet sein, Änderungen anderer Geräte
        fehlen. Verbindet automatisch neu.
      </span>
    </div>
  )
}
