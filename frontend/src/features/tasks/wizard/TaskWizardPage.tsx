import { useState } from 'react'
import { CustomerStep } from './CustomerStep'
import styles from './TaskWizardPage.module.css'
import type { CustomerStepValue } from './wizardState'

const STEPS = ['Kunde & Fahrzeug', 'Termin & Arbeiten', 'Prüfen & speichern']

/**
 * New task in steps. Step 1 (customer & vehicle) is built in 6c, steps 2 and 3 follow in
 * 6d/6e – until then the page is only reachable by its URL and not in the navigation.
 */
export function TaskWizardPage() {
  const [customerStep, setCustomerStep] = useState<CustomerStepValue>({ customer: null, vehicle: null })

  return (
    <>
      <h1>Neuer Auftrag</h1>
      <ol className={styles.steps} aria-label="Schritte">
        {STEPS.map((title, index) => (
          <li key={title} className={index === 0 ? styles.current : undefined} aria-current={index === 0 ? 'step' : undefined}>
            <span className={styles.number}>{index + 1}</span> {title}
          </li>
        ))}
      </ol>
      <CustomerStep value={customerStep} onChange={setCustomerStep} />
    </>
  )
}
