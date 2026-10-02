import { HealthPanel } from './HealthPanel'

export function SystemSeite() {
  return (
    <>
      <h1>System</h1>
      <p className="muted">Verbindung zu Backend und Datenbank</p>
      <HealthPanel />
    </>
  )
}
