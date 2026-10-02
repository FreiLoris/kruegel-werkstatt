import { useEffect, useState } from 'react'
import { fetchHealth, type HealthResponse } from './healthApi'

const REFRESH_INTERVAL_MS = 10_000

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; health: HealthResponse }
  | { kind: 'error'; message: string }

/**
 * Zeigt, ob Backend und Datenbank erreichbar sind.
 * Fragt den Status alle 10 Sekunden neu ab.
 */
export function HealthPanel() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const health = await fetchHealth(controller.signal)
        setState({ kind: 'loaded', health })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }

    void load()
    const interval = setInterval(load, REFRESH_INTERVAL_MS)

    // Aufräumen, wenn die Komponente verschwindet: Timer stoppen, laufenden Request abbrechen.
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [])

  if (state.kind === 'loading') {
    return <p className="muted">Prüfe Verbindung …</p>
  }

  const backendUp = state.kind === 'loaded'
  const dbUp = state.kind === 'loaded' && state.health.components?.db?.status === 'UP'

  return (
    <ul className="status-list">
      <StatusRow label="Backend" ok={backendUp} />
      <StatusRow label="Datenbank" ok={dbUp} />
      {state.kind === 'error' && <li className="status-row status-message muted">{state.message}</li>}
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
