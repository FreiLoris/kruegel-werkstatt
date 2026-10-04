import { PowerOff } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import styles from './CourtesyCarDialog.module.css'
import { useSaveCourtesyCar, useSetCourtesyCarActive, type CourtesyCar, type CourtesyCarRequest } from './courtesyCarApi'

/** Form state: all text while typing; empty = not set. */
interface FormValues {
  name: string
  model: string
  licensePlate: string
  serviceDue: string
  insuranceUntil: string
}

function initialValues(car?: CourtesyCar): FormValues {
  return {
    name: car?.name ?? '',
    model: car?.model ?? '',
    licensePlate: car?.licensePlate ?? '',
    serviceDue: car?.serviceDue ?? '',
    insuranceUntil: car?.insuranceUntil ?? '',
  }
}

/** Form values → JSON for the API. Empty fields are left out (the backend cleans up the rest). */
function toRequest(values: FormValues, version?: number): CourtesyCarRequest {
  return {
    name: values.name.trim(),
    model: values.model.trim() || undefined,
    licensePlate: values.licensePlate.trim() || undefined,
    serviceDue: values.serviceDue || undefined,
    insuranceUntil: values.insuranceUntil || undefined,
    version,
  }
}

/**
 * Create and edit a courtesy car – every field with a visible label
 * (UI review: the old form only had placeholders). Mounted fresh on every open (`key`).
 */
export function CourtesyCarDialog({ car, onClose }: { car?: CourtesyCar; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveCourtesyCar()
  const setActive = useSetCourtesyCarActive()
  const [values, setValues] = useState(() => initialValues(car))

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    // An old error message disappears as soon as something is corrected
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { id: car?.id, request: toRequest(values, car?.version) },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error(`${car?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
            // Field errors appear at the field – everything else as a message
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  async function takeOutOfService() {
    if (!car) return
    const ok = await confirm({
      title: `${car.name} ausser Betrieb nehmen?`,
      text: `${car.name} ist danach nicht mehr buchbar. Bisherige Buchungen bleiben erhalten. Unter «Ausser Betrieb» lässt sich das rückgängig machen.`,
      confirmLabel: 'Ausser Betrieb nehmen',
    })
    if (!ok) return
    setActive.mutate(
      { id: car.id, active: false },
      {
        onSuccess: () => {
          toast.success(`${car.name} ist ausser Betrieb`)
          onClose()
        },
        onError: (error) => toast.error(`${car.name}: ${error.message}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={car ? `${car.name} bearbeiten` : 'Neuer Ersatzwagen'}
      footer={
        <>
          {car?.active && (
            <Button variant="ghost" icon={PowerOff} onClick={takeOutOfService} loading={setActive.isPending} className={styles.left}>
              Ausser Betrieb nehmen
            </Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        <TextField
          label="Bezeichnung"
          required
          placeholder="z. B. Ersatzwagen 1"
          hint="So heisst das Fahrzeug in der Werkstatt."
          maxLength={40}
          autoComplete="off"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
        />
        <div className={styles.row}>
          <TextField
            label="Modell"
            placeholder="z. B. VW Polo"
            maxLength={40}
            autoComplete="off"
            value={values.model}
            onChange={(e) => set('model', e.target.value)}
            error={fieldError('model')}
          />
          <TextField
            label="Kennzeichen"
            placeholder="z. B. ZH 123456"
            maxLength={15}
            autoComplete="off"
            value={values.licensePlate}
            onChange={(e) => set('licensePlate', e.target.value)}
            error={fieldError('licensePlate')}
          />
        </div>
        <div className={styles.row}>
          <TextField
            label="Service fällig"
            type="date"
            hint="Warnung ab 30 Tage vorher"
            value={values.serviceDue}
            onChange={(e) => set('serviceDue', e.target.value)}
            error={fieldError('serviceDue')}
          />
          <TextField
            label="Versicherung bis"
            type="date"
            value={values.insuranceUntil}
            onChange={(e) => set('insuranceUntil', e.target.value)}
            error={fieldError('insuranceUntil')}
          />
        </div>
      </form>
    </Modal>
  )
}
