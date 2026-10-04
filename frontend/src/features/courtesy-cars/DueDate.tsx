import { CircleAlert, Clock } from 'lucide-react'
import { formatDate } from '../../lib/format'
import type { DueStatus } from './courtesyCarApi'
import styles from './DueDate.module.css'

/** Visible labels (German) per status and kind of date */
const LABELS: Record<'service' | 'insurance', Record<Exclude<DueStatus, 'OK'>, string>> = {
  service: { DUE_SOON: 'bald fällig', OVERDUE: 'überfällig' },
  insurance: { DUE_SOON: 'läuft bald ab', OVERDUE: 'abgelaufen' },
}

/**
 * A date such as "service due" with a warning if it is due soon or overdue.
 * The status is computed by the backend (central clock) – here it is only shown.
 * Color AND text AND icon: the warning must not depend on color alone.
 */
export function DueDate({ date, status, kind }: { date: string | null; status: DueStatus | null; kind: 'service' | 'insurance' }) {
  if (!date) {
    return <span className="muted">–</span>
  }
  const warning = status && status !== 'OK' ? status : null
  const Icon = warning === 'OVERDUE' ? CircleAlert : Clock
  return (
    <span className={styles.date}>
      {formatDate(date)}
      {warning && (
        <span className={`${styles.badge} ${styles[warning]}`}>
          <Icon aria-hidden />
          {LABELS[kind][warning]}
        </span>
      )}
    </span>
  )
}
