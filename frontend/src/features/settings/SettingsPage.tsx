import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CompanySettings } from '../company/CompanySettings'
import { CourtesyCarSettings } from '../courtesy-cars/CourtesyCarSettings'
import { InactiveCustomers } from '../customers/CustomerSettings'
import { InspectionStationSettings } from '../inspection-stations/InspectionStationSettings'
import { InsuranceSettings } from '../insurances/InsuranceSettings'
import { LiftSettings } from '../lifts/LiftSettings'
import { ServiceItemSettings } from '../service-items/ServiceItemSettings'
import { StorageLocationSettings } from '../stock/StorageLocationSettings'
import { LabelFormatSettings } from '../tire-hotel/LabelFormatSettings'
import { SeasonDeadlineSettings } from '../tire-hotel/SeasonDeadlineSettings'
import { TireLocationSettings } from '../tire-hotel/TireLocationSettings'
import { TreadLimitsSettings } from '../tire-hotel/TreadLimitsSettings'
import styles from './SettingsPage.module.css'

/** The areas of the page in their order – the overview at the top jumps to them */
const SECTIONS: { id: string; title: string; content: ReactNode }[] = [
  { id: 'firma', title: 'Firma', content: <CompanySettings /> },
  { id: 'lifte', title: 'Lifte', content: <LiftSettings /> },
  { id: 'leistungen', title: 'Leistungen', content: <ServiceItemSettings /> },
  { id: 'ersatzwagen', title: 'Ersatzwagen', content: <CourtesyCarSettings /> },
  { id: 'versicherungen', title: 'Versicherungen', content: <InsuranceSettings /> },
  { id: 'pruefstellen', title: 'Prüfstellen', content: <InspectionStationSettings /> },
  { id: 'lagerorte', title: 'Lagerorte', content: <StorageLocationSettings /> },
  { id: 'pneuhotel-standorte', title: 'Pneuhotel-Standorte', content: <TireLocationSettings /> },
  { id: 'profilgrenzen', title: 'Profilgrenzen', content: <TreadLimitsSettings /> },
  { id: 'stichtage', title: 'Stichtage Saisonwechsel', content: <SeasonDeadlineSettings /> },
  { id: 'etiketten', title: 'Etiketten', content: <LabelFormatSettings /> },
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
  return (
    <>
      <h1>Einstellungen</h1>
      <nav className={styles.overview} aria-label="Bereiche der Einstellungen">
        <ul className={styles.tiles}>
          {SECTIONS.map((section) => (
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
      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className={styles.section}>
          {section.content}
        </section>
      ))}
    </>
  )
}
