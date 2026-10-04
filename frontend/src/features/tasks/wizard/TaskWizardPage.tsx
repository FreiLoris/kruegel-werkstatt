import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { todayIso } from '../../../lib/format'
import { usePublicHolidays } from '../../publicholidays/publicHolidayApi'
import { EMPTY_APPOINTMENT, type AppointmentForm } from './appointmentForm'
import { AppointmentStep } from './AppointmentStep'
import { CustomerStep } from './CustomerStep'
import styles from './TaskWizardPage.module.css'
import type { CustomerStepValue } from './wizardState'

const STEPS = ['Kunde & Fahrzeug', 'Termin & Arbeiten', 'Prüfen & speichern']

type Step = 1 | 2

/**
 * New task in steps. Steps 1 and 2 are built (6c/6d), step 3 (check & save) follows in 6e –
 * until then the page is only reachable by its URL and not in the navigation.
 * All input lives here, so going back and forth loses nothing.
 */
export function TaskWizardPage() {
  const [step, setStep] = useState<Step>(1)
  const [customerStep, setCustomerStep] = useState<CustomerStepValue>({ customer: null, vehicle: null })
  const [appointment, setAppointment] = useState<AppointmentForm>(EMPTY_APPOINTMENT)
  const holidays = useHolidaysAroundToday()

  const customerStepComplete = customerStep.customer !== null && customerStep.vehicle !== null

  return (
    <div className={styles.page}>
      <h1>Neuer Auftrag</h1>
      <ol className={styles.steps} aria-label="Schritte">
        {STEPS.map((title, index) => (
          <li
            key={title}
            className={[index + 1 === step && styles.current, index + 1 < step && styles.done].filter(Boolean).join(' ') || undefined}
            aria-current={index + 1 === step ? 'step' : undefined}
          >
            <span className={styles.number}>{index + 1}</span> {title}
          </li>
        ))}
      </ol>

      {step === 1 && <CustomerStep value={customerStep} onChange={setCustomerStep} />}
      {step === 2 && (
        <>
          <ChosenCustomer value={customerStep} onChange={() => setStep(1)} />
          <AppointmentStep value={appointment} onChange={setAppointment} holidays={holidays} showRequired={false} />
        </>
      )}

      {/* Always visible at the bottom – the buttons are never cut off or scrolled away (UI review) */}
      <footer className={styles.footer}>
        {step === 1 ? (
          <>
            <span className="muted">{customerStepComplete ? '' : 'Kunde wählen und Fahrzeug festlegen (oder «noch offen»)'}</span>
            <Button variant="primary" icon={ArrowRight} disabled={!customerStepComplete} onClick={() => setStep(2)}>
              Weiter
            </Button>
          </>
        ) : (
          <Button icon={ArrowLeft} onClick={() => setStep(1)}>
            Zurück
          </Button>
        )}
      </footer>
    </div>
  )
}

/** One line with what step 1 decided – with a way back. */
function ChosenCustomer({ value, onChange }: { value: CustomerStepValue; onChange: () => void }) {
  const vehicle = value.vehicle?.kind === 'vehicle' ? value.vehicle.vehicle : null
  return (
    <p className={styles.chosen}>
      <strong>{value.customer?.displayName}</strong>
      {vehicle ? (
        <>
          {vehicle.licensePlate && <LicensePlate text={vehicle.licensePlate} size="sm" />}
          <span>{vehicle.description}</span>
        </>
      ) : (
        <span className="muted">Fahrzeug noch offen</span>
      )}
      <Button variant="ghost" small onClick={onChange}>
        ändern
      </Button>
    </p>
  )
}

/** Holidays of this and next year as date → name – enough for every appointment that is planned. */
function useHolidaysAroundToday(): ReadonlyMap<string, string> {
  const year = Number(todayIso().slice(0, 4))
  const { data } = usePublicHolidays(`${year - 1}-01-01`, `${year + 1}-12-31`)
  return useMemo(() => new Map((data ?? []).map((holiday) => [holiday.date, holiday.name])), [data])
}
