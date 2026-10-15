import { Link } from 'react-router'
import { CompanySettings } from '../company/CompanySettings'
import { CourtesyCarSettings } from '../courtesy-cars/CourtesyCarSettings'
import { InspectionStationSettings } from '../inspection-stations/InspectionStationSettings'
import { InsuranceSettings } from '../insurances/InsuranceSettings'
import { LiftSettings } from '../lifts/LiftSettings'
import { ServiceItemSettings } from '../service-items/ServiceItemSettings'
import { StorageLocationSettings } from '../stock/StorageLocationSettings'
import { TreadLimitsSettings } from '../tire-hotel/TreadLimitsSettings'
import styles from './SettingsPage.module.css'

/**
 * Master data that is rarely changed. Every area is its own section.
 */
export function SettingsPage() {
  return (
    <>
      <h1>Einstellungen</h1>
      <section className={styles.section}>
        <CompanySettings />
      </section>
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
        <InsuranceSettings />
      </section>
      <section className={styles.section}>
        <InspectionStationSettings />
      </section>
      <section className={styles.section}>
        <StorageLocationSettings />
      </section>
      <section className={styles.section}>
        <TreadLimitsSettings />
      </section>
      <section className={styles.section}>
        <h2>Kunden und Fahrzeuge</h2>
        <p className="muted">Werden in SwissGarage gepflegt und von dort importiert.</p>
        <Link to="/settings/swissgarage">Zum SwissGarage-Import</Link>
      </section>
    </>
  )
}
