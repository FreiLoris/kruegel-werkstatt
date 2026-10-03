import { Wrench } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { useAktiveMitarbeiter } from '../features/mitarbeiter/mitarbeiterApi'
import styles from './AppLayout.module.css'
import { LiveAnzeige } from './live/LiveAnzeige'
import { useLiveUpdates } from './live/useLiveUpdates'
import { navigation } from './navigation'
import { PersonAnzeige } from './person/PersonAnzeige'
import { PersonWahl } from './person/PersonWahl'
import { useGeraetPerson } from './person/useGeraetPerson'

/**
 * Rahmen jeder Seite: Kopfzeile mit Navigation, darunter der Seiteninhalt.
 * `<Outlet />` ist die Stelle, an der der Router die aktuelle Seite einsetzt.
 *
 * Hat das Gerät noch nicht gesagt, wer es benutzt, erscheint statt der Seite die Personenwahl.
 */
export function AppLayout() {
  const liveStatus = useLiveUpdates()
  const geraet = useGeraetPerson()
  const { data: aktive = [] } = useAktiveMitarbeiter()

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
        <PersonAnzeige status={geraet} />
        <LiveAnzeige status={liveStatus} />
      </header>
      <main className={styles.inhalt}>
        {geraet.art === 'waehlen' ? <PersonWahl aktive={aktive} nichtMehrAktiv={geraet.nichtMehrAktiv !== undefined} /> : <Outlet />}
      </main>
    </>
  )
}
