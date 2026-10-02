import { useQuery } from '@tanstack/react-query'
import styles from './HealthPanel.module.css'
import { fetchHealth } from './healthApi'

/**
 * Zeigt, ob Backend und Datenbank erreichbar sind. Fragt alle 10 Sekunden neu ab.
 *
 * Laden, Neuladen im Intervall und Abbrechen beim Verlassen der Seite
 * übernimmt TanStack Query.
 */
export function HealthPanel() {
  const { data, error, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 10_000,
    // Statusanzeige soll sofort umschalten, nicht erst nach einem zweiten Versuch.
    retry: false,
  })

  if (isPending) {
    return <p className="gedaempft">Prüfe Verbindung …</p>
  }

  const backendUp = !error
  const dbUp = data?.components?.db?.status === 'UP'

  return (
    <ul className={styles.liste}>
      <StatusZeile label="Backend" ok={backendUp} />
      <StatusZeile label="Datenbank" ok={dbUp} />
      {error && <li className={`${styles.zeile} ${styles.meldung}`}>{error.message}</li>}
    </ul>
  )
}

function StatusZeile({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={styles.zeile}>
      <span className={`${styles.punkt} ${ok ? styles.ok : styles.fehler}`} aria-hidden />
      <span>{label}</span>
      <span className="gedaempft">{ok ? 'erreichbar' : 'nicht erreichbar'}</span>
    </li>
  )
}
