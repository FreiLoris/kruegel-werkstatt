import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useModuleOn, type AppModule } from './moduleApi'

/** A part of a page that belongs to a module (neutral 3): gone while the module is off */
export function ModuleGate({ module, children }: { module: AppModule; children: ReactNode }) {
  return useModuleOn(module) ? children : null
}

/** A page of a module: while it is off, says so instead – an old bookmark must not lead into it */
export function ModulePage({ module, children }: { module: AppModule; children: ReactNode }) {
  return useModuleOn(module) ? (
    children
  ) : (
    <>
      <h1>Ausgeschaltet</h1>
      <p>
        Dieser Teil der App wird in diesem Betrieb nicht gebraucht. Einschalten lässt er sich in den{' '}
        <Link to="/settings#module">Einstellungen unter «Module»</Link>.
      </p>
    </>
  )
}
