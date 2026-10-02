import { NavLink, Outlet } from 'react-router'
import { navigation } from './navigation'

/**
 * Rahmen jeder Seite: Kopfzeile mit Navigation, darunter der Seiteninhalt.
 * `<Outlet />` ist die Stelle, an der der Router die aktuelle Seite einsetzt.
 */
export function AppLayout() {
  return (
    <>
      <header className="app-header">
        <span className="app-titel">Krügel Werkstatt</span>
        <nav className="app-nav">
          {navigation.map((eintrag) => (
            <NavLink
              key={eintrag.pfad}
              to={eintrag.pfad}
              // "end": Start-Link nur bei genau "/" aktiv, nicht bei jeder Unterseite
              end={eintrag.pfad === '/'}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-aktiv' : 'nav-link')}
            >
              {eintrag.titel}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
