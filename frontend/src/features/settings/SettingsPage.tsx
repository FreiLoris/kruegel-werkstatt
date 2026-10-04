import { LiftSettings } from '../lifts/LiftSettings'
import { ServiceItemSettings } from '../service-items/ServiceItemSettings'
import styles from './SettingsPage.module.css'

/**
 * Master data that is rarely changed. Every area is its own section;
 * courtesy cars (4c) will be added here.
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
    </>
  )
}
