import { Check, RotateCcw, Save, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError, reasonOf, type FieldError } from '../../../api/errors'
import { useUnsavedChanges } from '../../../app/useUnsavedChanges'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { LoadFailed } from '../../../components/ui/LoadFailed'
import { StickyFooter, StickyFooterSpacer } from '../../../components/ui/StickyFooter'
import { useToast } from '../../../components/ui/toastContext'
import { useHolidayNames } from '../../publicholidays/publicHolidayApi'
import { ServerErrors } from '../ServerErrors'
import { useTask, useUpdateTask, type AnyTask } from '../taskApi'
import { appointmentErrors, customerStepFromTask, formFromTask, toTaskRequest, type AppointmentForm } from '../wizard/appointmentForm'
import { AppointmentStep } from '../wizard/AppointmentStep'
import { CustomerStep } from '../wizard/CustomerStep'
import type { CustomerStepValue } from '../wizard/wizardState'
import styles from './TaskEditPage.module.css'
import { scrollToFirstError } from '../../../lib/scrollToFirstError'

/** Edit a task: the same form as the wizard, with the buttons in a footer that is always visible. */
export function TaskEditPage() {
  const { id } = useParams()
  const task = useTask(id)
  // Starts the form again – ONLY when the user asks for it. Not the version as key: a live update
  // (someone changed the status) would otherwise silently throw away what was typed here.
  const [generation, setGeneration] = useState(0)

  // the data wins: a failed background refetch (Wi-Fi gap) must not unmount the form and lose the input
  if (!task.data) {
    if (!task.error) return <p className="muted">Lade Auftrag …</p>
    return (
      <LoadFailed what="Auftrag" error={task.error} notFound={'Diesen Auftrag gibt es nicht (mehr) – vielleicht wurde er auf einem anderen Gerät gelöscht, oder der Link ist unvollständig.'} back={{ to: '/tasks', label: 'Zu den Terminen' }} onRetry={() => void task.refetch()} />
    )
  }
  return (
    <TaskEditForm
      key={`${task.data.id}-${generation}`}
      task={task.data}
      onReload={() => void task.refetch().then(() => setGeneration((g) => g + 1))}
      latest={async () => (await task.refetch()).data}
    />
  )
}

/**
 * Keeps the task as it was when the form was opened (`loaded`) – its version goes with the save,
 * so a change from another device in between gives a clear conflict instead of being overwritten.
 */
function TaskEditForm({ task: current, onReload, latest }: { task: AnyTask; onReload: () => void; latest: () => Promise<AnyTask | undefined> }) {
  const [task, setTask] = useState(current)
  const navigate = useNavigate()
  const toast = useToast()
  const update = useUpdateTask()
  const holidays = useHolidayNames()
  const [customerStep, setCustomerStep] = useState<CustomerStepValue>(() => customerStepFromTask(task))
  const [appointment, setAppointment] = useState<AppointmentForm>(() => formFromTask(task))
  const [changingCustomer, setChangingCustomer] = useState(false)
  const [showRequired, setShowRequired] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldError[]>([])
  const [conflict, setConflict] = useState(false)
  // what the form showed when it opened – leaving with anything else asks first (UX G-02)
  const [opened] = useState(() => JSON.stringify([customerStep, appointment]))
  const leave = useUnsavedChanges(JSON.stringify([customerStep, appointment]) !== opened)

  const back = () => navigate(`/tasks/${task.id}`)
  const customerComplete = customerStep.customer !== null && customerStep.vehicle !== null

  function save() {
    setShowRequired(true)
    setServerErrors([])
    if (!customerComplete) {
      setChangingCustomer(true)
      return
    }
    if (Object.keys(appointmentErrors(appointment)).length > 0) {
      scrollToFirstError()
      return
    }
    update.mutate(
      { id: task.id, request: toTaskRequest(customerStep, appointment, task.version) },
      {
        onSuccess: (saved) => {
          toast.success(`Auftrag ${saved.taskNumber ?? saved.customer.displayName} gespeichert`)
          leave()
          back()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isVersionConflict) {
            setConflict(true)
          } else if (error instanceof ApiError && error.isConflict) {
            // a rule, e.g. the lift was taken on another device just now – choose another, nothing to reload
            toast.error(reasonOf(error))
          } else if (error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0) {
            setServerErrors(error.problem.errors ?? [])
          } else {
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
          window.scrollTo({ top: 0, behavior: 'smooth' })
        },
      },
    )
  }

  /** Keeps what was typed here and takes the version of the latest state – the next save overwrites it on purpose */
  async function applyToLatest() {
    const fresh = await latest()
    if (!fresh) {
      toast.error('Der aktuelle Stand konnte nicht geladen werden.')
      return
    }
    setTask(fresh)
    setConflict(false)
  }

  const vehicle = customerStep.vehicle?.kind === 'vehicle' ? customerStep.vehicle.vehicle : null

  return (
    <>
      <h1>Auftrag bearbeiten</h1>

      {conflict && (
        <div className={styles.conflict} role="alert">
          <p>
            Dieser Auftrag wurde inzwischen auf einem anderen Gerät geändert (z. B. Status oder Termin verschoben). Deine
            Eingaben hier bleiben stehen: Du kannst sie auf den neuen Stand anwenden und dann speichern – sie ersetzen dabei
            die Änderung vom anderen Gerät. Oder den aktuellen Stand laden und deine Eingaben verwerfen.
          </p>
          <div className={styles.conflictActions}>
            <Button variant="primary" icon={Check} onClick={() => void applyToLatest()}>
              Meine Eingaben auf den neuen Stand anwenden
            </Button>
            <Button icon={RotateCcw} onClick={onReload}>
              Aktuellen Stand laden
            </Button>
          </div>
        </div>
      )}
      <ServerErrors errors={serverErrors} />

      <section className={styles.customer} aria-label="Kunde und Fahrzeug">
        {changingCustomer ? (
          <>
            <CustomerStep value={customerStep} onChange={setCustomerStep} />
            {customerComplete && (
              <Button className={styles.done} onClick={() => setChangingCustomer(false)}>
                Fertig
              </Button>
            )}
          </>
        ) : (
          <p className={styles.chosen}>
            <strong>{customerStep.customer?.displayName}</strong>
            {vehicle ? (
              <>
                {vehicle.licensePlate && <LicensePlate text={vehicle.licensePlate} size="sm" />}
                <span>{vehicle.description}</span>
              </>
            ) : (
              <span className="muted">Fahrzeug noch offen</span>
            )}
            <Button variant="ghost" small onClick={() => setChangingCustomer(true)}>
              Kunde oder Fahrzeug ändern
            </Button>
          </p>
        )}
      </section>

      <AppointmentStep
        value={appointment}
        onChange={setAppointment}
        holidays={holidays}
        showRequired={showRequired}
        taskId={task.id}
        vehicleId={vehicle?.id}
        customerId={customerStep.customer?.id}
      />

      <StickyFooterSpacer />
      <StickyFooter>
        <Button icon={X} onClick={back} disabled={update.isPending}>
          Abbrechen
        </Button>
        <Button variant="primary" icon={Save} onClick={save} loading={update.isPending} disabled={conflict}>
          Speichern
        </Button>
      </StickyFooter>
    </>
  )
}
