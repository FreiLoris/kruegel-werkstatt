import { HealthPanel } from './features/health/HealthPanel'

export default function App() {
  return (
    <main className="page">
      <h1>Krügel Werkstatt</h1>
      <p className="muted">Systemstatus</p>
      <HealthPanel />
    </main>
  )
}
