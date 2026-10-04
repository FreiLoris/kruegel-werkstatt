import { useQuery } from '@tanstack/react-query'
import styles from './HealthPanel.module.css'
import { fetchHealth } from './healthApi'

/**
 * Shows whether backend and database are reachable. Asks again every 10 seconds.
 *
 * Loading, reloading on an interval and cancelling when leaving the page are handled by
 * TanStack Query.
 */
export function HealthPanel() {
  const { data, error, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 10_000,
    // The status should switch immediately, not only after a second attempt.
    retry: false,
  })

  if (isPending) {
    return <p className="muted">Prüfe Verbindung …</p>
  }

  const backendUp = !error
  const dbUp = data?.components?.db?.status === 'UP'

  return (
    <ul className={styles.list}>
      <StatusRow label="Backend" ok={backendUp} />
      <StatusRow label="Datenbank" ok={dbUp} />
      {error && <li className={`${styles.row} ${styles.message}`}>{error.message}</li>}
    </ul>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={styles.row}>
      <span className={`${styles.dot} ${ok ? styles.ok : styles.error}`} aria-hidden />
      <span>{label}</span>
      <span className="muted">{ok ? 'erreichbar' : 'nicht erreichbar'}</span>
    </li>
  )
}
