import styles from './LiveIndicator.module.css'
import type { LiveStatus } from './useLiveUpdates'

/** Visible texts (German) per status */
const TEXTS: Record<LiveStatus, { short: string; long: string }> = {
  connecting: { short: 'Verbinde …', long: 'Live-Verbindung wird aufgebaut' },
  connected: { short: 'Live', long: 'Änderungen anderer Geräte erscheinen sofort' },
  disconnected: { short: 'Getrennt', long: 'Keine Verbindung zum Server – Anzeige kann veraltet sein. Verbindet automatisch neu.' },
}

/** Small status in the header: do changes from other devices arrive right now? */
export function LiveIndicator({ status }: { status: LiveStatus }) {
  const text = TEXTS[status]
  return (
    <span className={`${styles.indicator} ${styles[status] ?? ''}`} title={text.long} role="status">
      <span className={styles.dot} aria-hidden />
      {text.short}
    </span>
  )
}
