import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CompanySettings } from '../company/CompanySettings'
import { CourtesyCarSettings } from '../courtesy-cars/CourtesyCarSettings'
import { InactiveCustomers } from '../customers/CustomerSettings'
import { InspectionStationSettings } from '../inspection-stations/InspectionStationSettings'
import { InsuranceSettings } from '../insurances/InsuranceSettings'
import { LiftSettings } from '../lifts/LiftSettings'
import { useModulesOn, type AppModule } from '../modules/moduleApi'
import { ModuleSettingsForm } from '../modules/ModuleSettingsForm'
import { PublicHolidaySettingsForm } from '../publicholidays/PublicHolidaySettingsForm'
import { ReminderSettingsForm } from '../reminders/ReminderSettingsForm'
import { ScreenLockSettingsForm } from '../screenlock/ScreenLockSettingsForm'
import { ServiceItemSettings } from '../service-items/ServiceItemSettings'
import { StorageLocationSettings } from '../stock/StorageLocationSettings'
import { LabelFormatSettings } from '../tire-hotel/LabelFormatSettings'
import { SeasonDeadlineSettings } from '../tire-hotel/SeasonDeadlineSettings'
import { TireLocationSettings } from '../tire-hotel/TireLocationSettings'
import { TreadLimitsSettings } from '../tire-hotel/TreadLimitsSettings'
import styles from './SettingsPage.module.css'

/** The areas of the page in their order – the overview at the top jumps to them; a module's ones go with it (neutral 3) */
const SECTIONS: { id: string; title: string; content: ReactNode; module?: AppModule }[] = [
  { id: 'firma', title: 'Firma', content: <CompanySettings /> },
  { id: 'module', title: 'Module', content: <ModuleSettingsForm /> },
  { id: 'lifte', title: 'Lifte', content: <LiftSettings /> },
  { id: 'feiertage', title: 'Feiertage', content: <PublicHolidaySettingsForm /> },
  { id: 'leistungen', title: 'Leistungen', content: <ServiceItemSettings /> },
  { id: 'ersatzwagen', title: 'Ersatzwagen', content: <CourtesyCarSettings />, module: 'COURTESY_CARS' },
  { id: 'versicherungen', title: 'Versicherungen', content: <InsuranceSettings /> },
  { id: 'pruefstellen', title: 'Prüfstellen', content: <InspectionStationSettings />, module: 'MFK' },
  { id: 'lagerorte', title: 'Lagerorte', content: <StorageLocationSettings />, module: 'MATERIAL' },
  { id: 'pneuhotel-standorte', title: 'Pneuhotel-Standorte', content: <TireLocationSettings />, module: 'TIRE_HOTEL' },
  { id: 'profilgrenzen', title: 'Profilgrenzen', content: <TreadLimitsSettings />, module: 'TIRE_HOTEL' },
  { id: 'stichtage', title: 'Stichtage Saisonwechsel', content: <SeasonDeadlineSettings />, module: 'TIRE_HOTEL' },
  { id: 'etiketten', title: 'Etiketten', content: <LabelFormatSettings />, module: 'TIRE_HOTEL' },
  { id: 'bildschirmsperre', title: 'Bildschirmsperre', content: <ScreenLockSettingsForm /> },
  { id: 'erinnerungen', title: 'Kundenerinnerungen', content: <ReminderSettingsForm /> },
  {
    id: 'kunden',
    title: 'Kunden und Fahrzeuge',
    content: (
      <>
        <h2>Kunden und Fahrzeuge</h2>
        <p className="muted">Werden in SwissGarage gepflegt und von dort importiert.</p>
        <Link to="/settings/swissgarage">Zum SwissGarage-Import</Link>
        <InactiveCustomers />
      </>
    ),
  },
]

/**
 * Master data that is rarely changed. Every area is its own section; the overview at the top jumps
 * there (UX M-15: the page is long) and leads to the pages of their own – staff, import, system.
 */
export function SettingsPage() {
  const moduleOn = useModulesOn()
  const sections = SECTIONS.filter((section) => moduleOn(section.module))
  return (
    <>
      <h1>Einstellungen</h1>
      <nav className={styles.overview} aria-label="Bereiche der Einstellungen">
        <ul className={styles.tiles}>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className={styles.tile}>
                {section.title}
              </a>
            </li>
          ))}
        </ul>
        <ul className={styles.tiles}>
          <li>
            <Link to="/employees" className={`${styles.tile} ${styles.page}`}>
              Mitarbeiter →
            </Link>
          </li>
          <li>
            <Link to="/settings/swissgarage" className={`${styles.tile} ${styles.page}`}>
              SwissGarage-Import →
            </Link>
          </li>
          <li>
            <Link to="/system" className={`${styles.tile} ${styles.page}`}>
              System →
            </Link>
          </li>
        </ul>
      </nav>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className={styles.section}>
          {section.content}
        </section>
      ))}
    </>
  )
}
