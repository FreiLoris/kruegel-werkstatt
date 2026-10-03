import { LiftVerwaltung } from '../lifts/LiftVerwaltung'
import styles from './EinstellungenSeite.module.css'

/**
 * Stammdaten, die selten geändert werden. Jeder Bereich ist ein eigener Abschnitt;
 * Service-Leistungen (4b) und Ersatzwagen (4c) kommen hier dazu.
 */
export function EinstellungenSeite() {
  return (
    <>
      <h1>Einstellungen</h1>
      <section className={styles.abschnitt}>
        <LiftVerwaltung />
      </section>
    </>
  )
}
