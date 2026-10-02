import { Link } from 'react-router'
import { HealthPanel } from './HealthPanel'

export function SystemSeite() {
  return (
    <>
      <h1>System</h1>
      <p className="gedaempft">Verbindung zu Backend und Datenbank</p>
      <HealthPanel />
      <p style={{ marginTop: 'var(--abstand-6)' }}>
        <Link to="/system/komponenten">UI-Komponenten ansehen →</Link>
      </p>
    </>
  )
}
