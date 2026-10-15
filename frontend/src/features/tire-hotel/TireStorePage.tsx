import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../../api/errors'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { StickyFooter, StickyFooterSpacer } from '../../components/ui/StickyFooter'
import { useToast } from '../../components/ui/toastContext'
import { useToday } from '../../lib/clock'
import { CustomerStep } from '../tasks/wizard/CustomerStep'
import type { CustomerStepValue } from '../tasks/wizard/wizardState'
import { useSaveTireSet, useTreadLimits, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { TireSetFields } from './TireSetFields'
import { emptyForm, tireSetErrors, toTireSetRequest, type TireSetForm } from './tireSetForm'
import { TreadDepthsInput } from './TreadDepthsInput'

const EMPTY_CUSTOMER_STEP: CustomerStepValue = { customer: null, vehicle: null }

/**
 * Store a set (FB-07): customer and vehicle as in the task wizard, then the set with its tyres and
 * the tread depths. In the weeks of the tyre change many come one after the other – after saving
 * the page is empty again for the next customer, with a link to the set just stored.
 * The storage place (13n) and the prints (13p) become steps of their own.
 */
export function TireStorePage() {
  const today = useToday()
  const [step, setStep] = useState<1 | 2>(1)
  const [customerStep, setCustomerStep] = useState<CustomerStepValue>(EMPTY_CUSTOMER_STEP)
  const [form, setForm] = useState<TireSetForm>(() => emptyForm(today))
  const [showRequired, setShowRequired] = useState(false)
  const [last, setLast] = useState<TireSet | null>(null)
  const { data: limits } = useTreadLimits()
  const save = useSaveTireSet()
  const toast = useToast()

  const errors = tireSetErrors(form, today)
  const complete = Object.keys(errors).length === 0

  /** Once the vehicle is decided, on to the set – like the task wizard (one click less per customer). */
  function chooseCustomer(next: CustomerStepValue) {
    setCustomerStep(next)
    if (next.customer && next.vehicle) {
      setStep(2)
      window.scrollTo({ top: 0 })
    }
  }

  function store() {
    setShowRequired(true)
    if (!complete) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    save.mutate(
      { request: toTireSetRequest(customerStep, form) },
      {
        onSuccess: (saved) => {
          toast.success(`Satz von ${saved.customer.displayName} eingelagert`)
          setLast(saved)
          // empty for the next customer – the season stays (the same in these weeks)
          setCustomerStep(EMPTY_CUSTOMER_STEP)
          setForm({ ...emptyForm(today), season: form.season })
          setShowRequired(false)
          setStep(1)
          window.scrollTo({ top: 0 })
        },
        onError: (error) => {
          const fields = error instanceof ApiError ? (error.problem.errors ?? []) : []
          toast.error(
            fields.length > 0 ? `Nicht gespeichert: ${fields.map((f) => f.message).join(', ')}` : `Speichern fehlgeschlagen: ${error.message}`,
          )
        },
      },
    )
  }

  const vehicle = customerStep.vehicle?.kind === 'vehicle' ? customerStep.vehicle.vehicle : null

  return (
    <>
      <div className={styles.header}>
        <h1>Einlagern</h1>
        <Link to="/tires">Zum Pneuhotel</Link>
      </div>
      {last && (
        <p className={styles.chosen} role="status">
          Zuletzt eingelagert: <Link to={`/tires/${last.id}`}>{last.customer.displayName}</Link>
          {last.vehicle?.licensePlate && <LicensePlate text={last.vehicle.licensePlate} size="sm" />}
        </p>
      )}

      {step === 1 && <CustomerStep value={customerStep} onChange={chooseCustomer} />}
      {step === 2 && (
        <>
          <p className={styles.chosen}>
            <strong>{customerStep.customer?.displayName}</strong>
            {vehicle ? (
              <>
                {vehicle.licensePlate && <LicensePlate text={vehicle.licensePlate} size="sm" />} {vehicle.description}
              </>
            ) : (
              <span className="muted">Fahrzeug noch offen</span>
            )}
            <Button variant="ghost" small onClick={() => setStep(1)}>
              ändern
            </Button>
          </p>
          <section className={styles.section} aria-labelledby="set-title">
            <h2 id="set-title">Satz</h2>
            <TireSetFields form={form} onChange={setForm} errors={errors} showRequired={showRequired} />
          </section>
          <section className={styles.section} aria-labelledby="tread-title">
            <h2 id="tread-title">Profiltiefe</h2>
            <TreadDepthsInput form={form} onChange={setForm} errors={errors} limits={limits} />
          </section>
        </>
      )}

      <StickyFooterSpacer />
      <StickyFooter>
        {step === 1 ? (
          <>
            <span className="muted">Kunde wählen und Fahrzeug festlegen (oder «noch offen»)</span>
            <Button variant="primary" icon={ArrowRight} disabled={!customerStep.customer || !customerStep.vehicle} onClick={() => setStep(2)}>
              Weiter
            </Button>
          </>
        ) : (
          <>
            <Button icon={ArrowLeft} onClick={() => setStep(1)} disabled={save.isPending}>
              Zurück
            </Button>
            {showRequired && !complete && <span className={styles.hint}>Bitte die markierten Felder prüfen</span>}
            <Button variant="primary" icon={Save} onClick={store} loading={save.isPending}>
              Einlagern
            </Button>
          </>
        )}
      </StickyFooter>
    </>
  )
}
