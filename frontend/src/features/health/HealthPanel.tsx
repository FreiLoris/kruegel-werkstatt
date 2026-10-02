import { useQuery } from '@tanstack/react-query'
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
    return <p className="muted">Prüfe Verbindung …</p>
  }

  const backendUp = !error
  const dbUp = data?.components?.db?.status === 'UP'

  return (
    <ul className="status-list">
      <StatusRow label="Backend" ok={backendUp} />
      <StatusRow label="Datenbank" ok={dbUp} />
      {error && <li className="status-row status-message muted">{error.message}</li>}
    </ul>
  )
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="status-row">
      <span className={ok ? 'dot dot-ok' : 'dot dot-error'} aria-hidden />
      <span>{label}</span>
      <span className="muted">{ok ? 'erreichbar' : 'nicht erreichbar'}</span>
    </li>
  )
}
