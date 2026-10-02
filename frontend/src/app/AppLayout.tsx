import { Wrench } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import styles from './AppLayout.module.css'
import { navigation } from './navigation'

/**
 * Rahmen jeder Seite: Kopfzeile mit Navigation, darunter der Seiteninhalt.
 * `<Outlet />` ist die Stelle, an der der Router die aktuelle Seite einsetzt.
 */
export function AppLayout() {
  return (
    <>
      <header className={styles.kopfzeile}>
        <Link to="/" className={styles.titel}>
          <Wrench aria-hidden />
          Krügel Werkstatt
        </Link>
        <nav className={styles.navigation}>
          {navigation.map((eintrag) => (
            <NavLink
              key={eintrag.pfad}
              to={eintrag.pfad}
              // "end": Start-Link nur bei genau "/" aktiv, nicht bei jeder Unterseite
              end={eintrag.pfad === '/'}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.aktiv}` : styles.link)}
            >
              {eintrag.titel}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className={styles.inhalt}>
        <Outlet />
      </main>
    </>
  )
}
