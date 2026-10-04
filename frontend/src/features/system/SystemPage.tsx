import { Link } from 'react-router'
import { HealthPanel } from './HealthPanel'

export function SystemPage() {
  return (
    <>
      <h1>System</h1>
      <p className="muted">Verbindung zu Backend und Datenbank</p>
      <HealthPanel />
      <p style={{ marginTop: 'var(--space-6)' }}>
        <Link to="/system/components">UI-Komponenten ansehen →</Link>
      </p>
    </>
  )
}
