import styles from './LiveAnzeige.module.css'
import type { LiveStatus } from './useLiveUpdates'

const TEXTE: Record<LiveStatus, { kurz: string; lang: string }> = {
  verbinde: { kurz: 'Verbinde …', lang: 'Live-Verbindung wird aufgebaut' },
  verbunden: { kurz: 'Live', lang: 'Änderungen anderer Geräte erscheinen sofort' },
  getrennt: { kurz: 'Getrennt', lang: 'Keine Verbindung zum Server – Anzeige kann veraltet sein. Verbindet automatisch neu.' },
}

/** Kleiner Status in der Kopfzeile: Kommen Änderungen anderer Geräte gerade an? */
export function LiveAnzeige({ status }: { status: LiveStatus }) {
  const text = TEXTE[status]
  return (
    <span className={`${styles.anzeige} ${styles[status]}`} title={text.lang} role="status">
      <span className={styles.punkt} aria-hidden />
      {text.kurz}
    </span>
  )
}
