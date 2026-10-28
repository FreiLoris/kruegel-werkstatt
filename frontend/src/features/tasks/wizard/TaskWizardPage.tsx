import { ArrowLeft, ArrowRight, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError, reasonOf, type FieldError } from '../../../api/errors'
import { useUnsavedChanges } from '../../../app/useUnsavedChanges'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { StickyFooter, StickyFooterSpacer } from '../../../components/ui/StickyFooter'
import { useToast } from '../../../components/ui/toastContext'
import { useSingleFlight } from '../../../lib/useSingleFlight'
import { useHolidayNames } from '../../publicholidays/publicHolidayApi'
import { useCreateTaskWithBooking, type Booking } from '../../bookings/bookingApi'
import { useCustomer } from '../../customers/customerApi'
import { useTireSet, type TireSet } from '../../tire-hotel/tireHotelApi'
import type { Customer } from '../../customers/customerSearchApi'
import { choiceError, NO_COURTESY_CAR, periodOf, type CourtesyCarChoice } from '../../bookings/courtesyCarChoice'
import { CourtesyCarSection } from '../../bookings/CourtesyCarSection'
import { useCreateTask, type AnyTask } from '../taskApi'
import { appointmentErrors, EMPTY_APPOINTMENT, slotFromUrl, toTaskRequest, withSlot, type AppointmentForm } from './appointmentForm'
import { AppointmentStep } from './AppointmentStep'
import { CustomerStep } from './CustomerStep'
import { ReviewStep } from './ReviewStep'
import { SavedStep } from './SavedStep'
import { tireChangeKindOf } from './tireAppointment'
import styles from './TaskWizardPage.module.css'
import { clearDraft, loadDraft, storeDraft, type WizardDraft } from './wizardDraft'
import type { CustomerStepValue } from './wizardState'
import { scrollToFirstError } from '../../../lib/scrollToFirstError'
import { useMyEmployeeId } from '../../../app/person/useDevicePerson'
import { followed, useFollowPerson } from '../../../app/person/useFollowPerson'

const STEPS = ['Kunde & Fahrzeug', 'Termin & Arbeiten', 'Prüfen & speichern']

type Step = 1 | 2 | 3

const EMPTY_CUSTOMER_STEP: CustomerStepValue = { customer: null, vehicle: null }

/** A click this soon after the review appeared belongs to the double click on "Weiter" */
const REVIEW_BEFORE_SAVE_MS = 400

/**
 * New task in three steps, then a clear confirmation. All input lives here, so going back and
 * forth loses nothing; "Weiteren Auftrag erfassen" starts empty again. Leaving with input asks first,
 * and after a reload the started task is offered again (UX G-01).
 */
export function TaskWizardPage() {
  const [params] = useSearchParams()
  // "Neuer Auftrag für diesen Kunden" on the customer page (UX G-05)
  const customerId = params.get('customer') ?? undefined
  const preset = useCustomer(customerId)
  // "Termin abmachen" on a tyre set (FB-18)
  const tireSetId = params.get('tireSet') ?? undefined
  const tireSet = useTireSet(tireSetId)
  if ((customerId && !preset.data && !preset.error) || (tireSetId && !tireSet.data && !tireSet.error)) {
    return (
      <>
        <h1>Neuer Auftrag</h1>
        <p className="muted">{tireSetId ? 'Lade Satz …' : 'Lade Kunde …'}</p>
      </>
    )
  }
  return (
    <>
      {tireSet.error && <p className="muted">Satz konnte nicht geladen werden ({tireSet.error.message}) – bitte Kunde wählen.</p>}
      <TaskWizard initialCustomer={tireSet.data?.customer ?? preset.data ?? null} tireSet={tireSet.data ?? null} />
    </>
  )
}

/**
 * @param tireSet from the tyre hotel (FB-18): its customer and vehicle, the tyre change ticked – the
 *   wizard starts with the appointment
 */
function TaskWizard({ initialCustomer, tireSet }: { initialCustomer: Customer | null; tireSet: TireSet | null }) {
  // what counts as "nothing typed yet" – the prefill, and empty again after "Weiteren Auftrag erfassen"
  const [startCustomerStep, setStartCustomerStep] = useState<CustomerStepValue>(() => ({
    customer: initialCustomer,
    vehicle: tireSet?.vehicle ? { kind: 'vehicle', vehicle: tireSet.vehicle } : null,
  }))
  const [step, setStep] = useState<Step>(startCustomerStep.vehicle ? 2 : 1)
  const [customerStep, setCustomerStep] = useState<CustomerStepValue>(startCustomerStep)
  const [params] = useSearchParams()
  // dragged open in the day view → date, time, end and lift are already there
  // FB-29: "Angenommen von" is the person at the device – changeable, and it follows a switch
  const me = useMyEmployeeId()
  const emptyAppointment = { ...EMPTY_APPOINTMENT, acceptedById: me ?? '' }
  const [startAppointment, setStartAppointment] = useState<AppointmentForm>(() => {
    const slot = slotFromUrl(params)
    const start = tireSet ? { ...emptyAppointment, tireChange: true, tireChangeKind: tireChangeKindOf(tireSet) } : emptyAppointment
    return slot ? withSlot(start, slot, new Set()) : start
  })
  const [appointment, setAppointment] = useState<AppointmentForm>(startAppointment)
  useFollowPerson(me, (previous, next) => {
    const follow = (form: AppointmentForm) => ({ ...form, acceptedById: followed(form.acceptedById, previous, next) })
    setStartAppointment(follow)
    setAppointment(follow)
  })
  // a task started before a reload – offered, not filled in by itself: it may be someone else's
  const [draft, setDraft] = useState<WizardDraft | null>(loadDraft)
  const [showRequired, setShowRequired] = useState(false)
  const [courtesyCar, setCourtesyCar] = useState<CourtesyCarChoice>(NO_COURTESY_CAR)
  const [saved, setSaved] = useState<{ task: AnyTask; booking: Booking | null } | null>(null)
  const [serverErrors, setServerErrors] = useState<FieldError[]>([])
  const holidays = useHolidayNames()
  const create = useCreateTask()
  const createWithCar = useCreateTaskWithBooking()
  const saving = create.isPending || createWithCar.isPending
  const toast = useToast()
  const once = useSingleFlight()
  const dirty =
    saved === null &&
    (JSON.stringify(customerStep) !== JSON.stringify(startCustomerStep) ||
      courtesyCar.wanted ||
      JSON.stringify(appointment) !== JSON.stringify(startAppointment))
  useUnsavedChanges(dirty)

  // while the old draft is still offered it stays stored – the empty form must not overwrite it
  useEffect(() => {
    if (draft) return
    if (dirty) storeDraft({ step, customerStep, appointment, courtesyCar })
    else clearDraft()
  }, [draft, dirty, step, customerStep, appointment, courtesyCar])

  function continueDraft(from: WizardDraft) {
    setCustomerStep(from.customerStep)
    setAppointment(from.appointment)
    setCourtesyCar(from.courtesyCar)
    // the review needs the checks of step 2 first
    setStep(from.step === 3 ? 2 : from.step)
    setDraft(null)
  }

  // "Auftrag speichern" sits where "Weiter" was: the second click of a double click must not save
  // without the review being seen (UX G-03)
  const reviewShownAt = useRef(0)

  /** "Noch kein Termin" ticked: a courtesy car chosen before is dropped – it would be booked for a day nobody knows. */
  function changeAppointment(next: AppointmentForm) {
    setAppointment(next)
    if (next.noAppointment && courtesyCar.wanted) setCourtesyCar(NO_COURTESY_CAR)
  }

  const customerStepComplete = customerStep.customer !== null && customerStep.vehicle !== null
  const appointmentComplete =
    Object.keys(appointmentErrors(appointment)).length === 0 && choiceError(courtesyCar, appointment) === null

  /**
   * Step 1 reports a choice. Once the vehicle is decided (a vehicle or "noch offen") the wizard
   * goes on by itself – one click less per order (feedback from the workshop, 10/2026). It reacts
   * to the click, not to the state: coming back to step 1 does not jump forward again, and
   * "Weiter" stays for that case.
   */
  function chooseCustomerStep(next: CustomerStepValue) {
    setCustomerStep(next)
    if (next.customer !== null && next.vehicle !== null) {
      setStep(2)
      // the vehicle list may be scrolled – step 2 starts at its top
      window.scrollTo({ top: 0 })
    }
  }

  function toReview() {
    setShowRequired(true)
    if (appointmentComplete) {
      setServerErrors([])
      reviewShownAt.current = Date.now()
      setStep(3)
    } else {
      scrollToFirstError()
    }
  }

  function save() {
    if (Date.now() - reviewShownAt.current < REVIEW_BEFORE_SAVE_MS) return
    const request = toTaskRequest(customerStep, appointment)
    const period = periodOf(courtesyCar, appointment)
    const onSuccess = (task: AnyTask, booking: Booking | null) => {
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
    once((done) => {
      if (courtesyCar.wanted && period) {
        createWithCar.mutate(
          { task: request, courtesyCar: { courtesyCarId: courtesyCar.courtesyCarId, ...period, notes: courtesyCar.notes.trim() || undefined } },
          { onSuccess: (result) => onSuccess(result.task, result.booking), onError, onSettled: done },
        )
      } else {
        create.mutate(request, { onSuccess: (task) => onSuccess(task, null), onError, onSettled: done })
      }
    })
  }

  function startOver() {
    setStartCustomerStep(EMPTY_CUSTOMER_STEP)
    setStartAppointment(emptyAppointment)
    setCustomerStep(EMPTY_CUSTOMER_STEP)
    setAppointment(emptyAppointment)
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
      {draft && (
        <div className={styles.draft} role="status">
          <p>
            Ein angefangener Auftrag ist noch da
            {draft.customerStep.customer ? ` (${draft.customerStep.customer.displayName})` : ''}. Weitermachen?
          </p>
          <Button variant="primary" onClick={() => continueDraft(draft)}>
            Weitermachen
          </Button>
          <Button icon={Trash2} onClick={() => setDraft(null)}>
            Verwerfen
          </Button>
        </div>
      )}
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

      {step === 1 && <CustomerStep value={customerStep} onChange={chooseCustomerStep} />}
      {step === 2 && (
        <>
          <ChosenCustomer value={customerStep} onChange={() => setStep(1)} />
          <AppointmentStep
            value={appointment}
            onChange={changeAppointment}
            holidays={holidays}
            showRequired={showRequired}
            vehicleId={customerStep.vehicle?.kind === 'vehicle' ? customerStep.vehicle.vehicle.id : undefined}
            customerId={customerStep.customer?.id}
          >
            {/* a courtesy car is booked for a period – without an appointment there is none yet */}
            {!appointment.noAppointment && (
              <CourtesyCarSection value={courtesyCar} onChange={setCourtesyCar} appointment={appointment} showRequired={showRequired} />
            )}
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
