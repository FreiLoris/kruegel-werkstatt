import { LiftVerwaltung } from '../lifts/LiftVerwaltung'
import { ServiceleistungVerwaltung } from '../serviceleistungen/ServiceleistungVerwaltung'
import styles from './EinstellungenSeite.module.css'

/**
 * Stammdaten, die selten geändert werden. Jeder Bereich ist ein eigener Abschnitt;
 * Ersatzwagen (4c) kommt hier dazu.
 */
export function EinstellungenSeite() {
  return (
    <>
      <h1>Einstellungen</h1>
      <section className={styles.abschnitt}>
        <LiftVerwaltung />
      </section>
      <section className={styles.abschnitt}>
        <ServiceleistungVerwaltung />
      </section>
    </>
  )
}
