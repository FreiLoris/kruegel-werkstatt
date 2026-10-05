import { RotateCcw, Save, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError, type FieldError } from '../../../api/errors'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { StickyFooter, StickyFooterSpacer } from '../../../components/ui/StickyFooter'
import { useToast } from '../../../components/ui/toastContext'
import { useHolidayNames } from '../../publicholidays/publicHolidayApi'
import { ServerErrors } from '../ServerErrors'
import { useTask, useUpdateTask, type Task } from '../taskApi'
import { appointmentErrors, customerStepFromTask, formFromTask, toTaskRequest, type AppointmentForm } from '../wizard/appointmentForm'
import { AppointmentStep } from '../wizard/AppointmentStep'
import { CustomerStep } from '../wizard/CustomerStep'
import type { CustomerStepValue } from '../wizard/wizardState'
import styles from './TaskEditPage.module.css'

/** Edit a task: the same form as the wizard, with the buttons in a footer that is always visible. */
export function TaskEditPage() {
  const { id } = useParams()
  const task = useTask(id)
  // Starts the form again – ONLY when the user asks for it. Not the version as key: a live update
  // (someone changed the status) would otherwise silently throw away what was typed here.
  const [generation, setGeneration] = useState(0)

  if (task.error) return <p className="muted">Auftrag konnte nicht geladen werden: {task.error.message}</p>
  if (!task.data) return <p className="muted">Lade Auftrag …</p>
  return (
    <TaskEditForm
      key={`${task.data.id}-${generation}`}
      task={task.data}
      onReload={() => void task.refetch().then(() => setGeneration((g) => g + 1))}
    />
  )
}

/**
 * Keeps the task as it was when the form was opened (`loaded`) – its version goes with the save,
 * so a change from another device in between gives a clear conflict instead of being overwritten.
 */
function TaskEditForm({ task: current, onReload }: { task: Task; onReload: () => void }) {
  const [task] = useState(current)
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

  const back = () => navigate(`/tasks/${task.id}`)
  const customerComplete = customerStep.customer !== null && customerStep.vehicle !== null

  function save() {
    setShowRequired(true)
    if (!customerComplete) {
      setChangingCustomer(true)
      return
    }
    if (Object.keys(appointmentErrors(appointment)).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    update.mutate(
      { id: task.id, request: toTaskRequest(customerStep, appointment, task.version) },
      {
        onSuccess: () => {
          toast.success('Auftrag gespeichert')
          back()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            setConflict(true)
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

  const vehicle = customerStep.vehicle?.kind === 'vehicle' ? customerStep.vehicle.vehicle : null

  return (
    <>
      <h1>Auftrag bearbeiten</h1>

      {conflict && (
        <div className={styles.conflict} role="alert">
          <p>
            Dieser Auftrag wurde inzwischen auf einem anderen Gerät geändert (z. B. Status oder Termin verschoben). Bitte den
            aktuellen Stand laden – deine Änderungen hier gehen dabei verloren.
          </p>
          <Button icon={RotateCcw} onClick={onReload}>
            Aktuellen Stand laden
          </Button>
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

      <AppointmentStep value={appointment} onChange={setAppointment} holidays={holidays} showRequired={showRequired} taskId={task.id} />

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
