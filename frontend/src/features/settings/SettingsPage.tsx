import { Link } from 'react-router'
import { CourtesyCarSettings } from '../courtesy-cars/CourtesyCarSettings'
import { LiftSettings } from '../lifts/LiftSettings'
import { ServiceItemSettings } from '../service-items/ServiceItemSettings'
import styles from './SettingsPage.module.css'

/**
 * Master data that is rarely changed. Every area is its own section.
 */
export function SettingsPage() {
  return (
    <>
      <h1>Einstellungen</h1>
      <section className={styles.section}>
        <LiftSettings />
      </section>
      <section className={styles.section}>
        <ServiceItemSettings />
      </section>
      <section className={styles.section}>
        <CourtesyCarSettings />
      </section>
      <section className={styles.section}>
        <h2>Kunden und Fahrzeuge</h2>
        <p className="muted">Werden in SwissGarage gepflegt und von dort importiert.</p>
        <Link to="/settings/swissgarage">Zum SwissGarage-Import</Link>
      </section>
    </>
  )
}
