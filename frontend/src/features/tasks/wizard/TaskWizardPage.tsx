import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError, reasonOf, type FieldError } from '../../../api/errors'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { StickyFooter, StickyFooterSpacer } from '../../../components/ui/StickyFooter'
import { useToast } from '../../../components/ui/toastContext'
import { useHolidayNames } from '../../publicholidays/publicHolidayApi'
import { useCreateTaskWithBooking, type Booking } from '../../bookings/bookingApi'
import { choiceError, NO_COURTESY_CAR, periodOf, type CourtesyCarChoice } from '../../bookings/courtesyCarChoice'
import { CourtesyCarSection } from '../../bookings/CourtesyCarSection'
import { useCreateTask, type Task } from '../taskApi'
import { appointmentErrors, EMPTY_APPOINTMENT, slotFromUrl, toTaskRequest, withSlot, type AppointmentForm } from './appointmentForm'
import { AppointmentStep } from './AppointmentStep'
import { CustomerStep } from './CustomerStep'
import { ReviewStep } from './ReviewStep'
import { SavedStep } from './SavedStep'
import styles from './TaskWizardPage.module.css'
import type { CustomerStepValue } from './wizardState'

const STEPS = ['Kunde & Fahrzeug', 'Termin & Arbeiten', 'Prüfen & speichern']

type Step = 1 | 2 | 3

const EMPTY_CUSTOMER_STEP: CustomerStepValue = { customer: null, vehicle: null }

/**
 * New task in three steps, then a clear confirmation. All input lives here, so going back and
 * forth loses nothing; "Weiteren Auftrag erfassen" starts empty again.
 */
export function TaskWizardPage() {
  const [step, setStep] = useState<Step>(1)
  const [customerStep, setCustomerStep] = useState<CustomerStepValue>(EMPTY_CUSTOMER_STEP)
  const [params] = useSearchParams()
  // dragged open in the day view → date, time, end and lift are already there
  const [appointment, setAppointment] = useState<AppointmentForm>(() => {
    const slot = slotFromUrl(params)
    return slot ? withSlot(EMPTY_APPOINTMENT, slot, new Set()) : EMPTY_APPOINTMENT
  })
  const [showRequired, setShowRequired] = useState(false)
  const [courtesyCar, setCourtesyCar] = useState<CourtesyCarChoice>(NO_COURTESY_CAR)
  const [saved, setSaved] = useState<{ task: Task; booking: Booking | null } | null>(null)
  const [serverErrors, setServerErrors] = useState<FieldError[]>([])
  const holidays = useHolidayNames()
  const create = useCreateTask()
  const createWithCar = useCreateTaskWithBooking()
  const saving = create.isPending || createWithCar.isPending
  const toast = useToast()

  const customerStepComplete = customerStep.customer !== null && customerStep.vehicle !== null
  const appointmentComplete =
    Object.keys(appointmentErrors(appointment)).length === 0 && choiceError(courtesyCar, appointment) === null

  function toReview() {
    setShowRequired(true)
    if (appointmentComplete) {
      setServerErrors([])
      setStep(3)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function save() {
    const request = toTaskRequest(customerStep, appointment)
    const period = periodOf(courtesyCar, appointment)
    const onSuccess = (task: Task, booking: Booking | null) => {
      setSaved({ task, booking })
      window.scrollTo({ top: 0 })
    }
    const onError = (error: Error) => {
      const fieldErrors = error instanceof ApiError ? (error.problem.errors ?? []) : []
      if (fieldErrors.length > 0) {
        // e.g. the mechanic was deactivated in the meantime – shown in words on the review
        setServerErrors(fieldErrors)
      } else if (error instanceof ApiError && error.isConflict) {
        // e.g. the courtesy car was booked on another device meanwhile – nothing was saved
        setServerErrors([{ field: '', message: reasonOf(error) }])
      } else {
        toast.error(`Speichern fehlgeschlagen: ${error.message}`)
      }
    }
    if (courtesyCar.wanted && period) {
      createWithCar.mutate(
        { task: request, courtesyCar: { courtesyCarId: courtesyCar.courtesyCarId, ...period, notes: courtesyCar.notes.trim() || undefined } },
        { onSuccess: (result) => onSuccess(result.task, result.booking), onError },
      )
    } else {
      create.mutate(request, { onSuccess: (task) => onSuccess(task, null), onError })
    }
  }

  function startOver() {
    setCustomerStep(EMPTY_CUSTOMER_STEP)
    setAppointment(EMPTY_APPOINTMENT)
    setCourtesyCar(NO_COURTESY_CAR)
    setShowRequired(false)
    setServerErrors([])
    setSaved(null)
    create.reset()
    createWithCar.reset()
    setStep(1)
  }

  if (saved) {
    return (
      <>
        <h1>Neuer Auftrag</h1>
        <SavedStep task={saved.task} booking={saved.booking} onNext={startOver} />
      </>
    )
  }

  return (
    <>
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
          <AppointmentStep value={appointment} onChange={setAppointment} holidays={holidays} showRequired={showRequired}>
            <CourtesyCarSection value={courtesyCar} onChange={setCourtesyCar} appointment={appointment} showRequired={showRequired} />
          </AppointmentStep>
        </>
      )}
      {step === 3 && (
        <ReviewStep
          customerStep={customerStep}
          appointment={appointment}
          courtesyCar={courtesyCar}
          onEdit={setStep}
          serverErrors={serverErrors}
        />
      )}

      <StickyFooterSpacer />
      <StickyFooter>
        {step === 1 && (
          <>
            <span className="muted">{customerStepComplete ? '' : 'Kunde wählen und Fahrzeug festlegen (oder «noch offen»)'}</span>
            <Button variant="primary" icon={ArrowRight} disabled={!customerStepComplete} onClick={() => setStep(2)}>
              Weiter
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button icon={ArrowLeft} onClick={() => setStep(1)}>
              Zurück
            </Button>
            {showRequired && !appointmentComplete && <span className={styles.hint}>Bitte die markierten Felder prüfen</span>}
            <Button variant="primary" icon={ArrowRight} onClick={toReview}>
              Weiter
            </Button>
          </>
        )}
        {step === 3 && (
          <>
            <Button icon={ArrowLeft} onClick={() => setStep(2)} disabled={saving}>
              Zurück
            </Button>
            <Button variant="primary" icon={Save} onClick={save} loading={saving}>
              Auftrag speichern
            </Button>
          </>
        )}
      </StickyFooter>
    </>
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
