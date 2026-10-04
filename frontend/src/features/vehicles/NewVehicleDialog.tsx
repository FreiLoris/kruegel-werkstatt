import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { LicensePlateField } from '../../components/licenseplate/LicensePlateField'
import { Button } from '../../components/ui/Button'
import styles from '../../components/ui/FormDialog.module.css'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useCreateVehicle, type Vehicle } from './vehicleApi'

interface FormValues {
  licensePlate: string
  make: string
  model: string
  firstRegistration: string
  lastMfk: string
  mileageKm: string
}

const EMPTY: FormValues = { licensePlate: '', make: '', model: '', firstRegistration: '', lastMfk: '', mileageKm: '' }

/**
 * Vehicle of a customer that is not in SwissGarage – e.g. a walk-in's car.
 *
 * @param fromSwissGarage the customer comes from SwissGarage → hint: the car will probably come with
 *                        the next import, then "Fahrzeug noch offen" avoids a duplicate
 */
export function NewVehicleDialog({
  customerId,
  fromSwissGarage,
  onCreated,
  onClose,
}: {
  customerId: string
  fromSwissGarage: boolean
  onCreated: (vehicle: Vehicle) => void
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const create = useCreateVehicle()
  const [values, setValues] = useState(EMPTY)

  const fieldError = (field: string) => (create.error instanceof ApiError ? create.error.messageForField(field) : undefined)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    if (create.error) create.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      {
        customerId,
        licensePlate: values.licensePlate.trim() || undefined,
        make: values.make.trim() || undefined,
        model: values.model.trim() || undefined,
        firstRegistration: values.firstRegistration || undefined,
        lastMfk: values.lastMfk || undefined,
        mileageKm: values.mileageKm ? Number(values.mileageKm) : undefined,
      },
      {
        onSuccess: (vehicle) => {
          toast.success(`${vehicle.description} erfasst`)
          onCreated(vehicle)
        },
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Neues Fahrzeug"
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={create.isPending}>
            Fahrzeug erfassen
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        {fromSwissGarage && (
          <p className={styles.note}>
            Kommt das Fahrzeug bald aus SwissGarage (z. B. neu gekauft)? Dann besser «Fahrzeug noch offen» wählen und
            nach dem nächsten Import nachtragen – sonst gibt es das Auto doppelt.
          </p>
        )}
        <LicensePlateField value={values.licensePlate} onChange={(plate) => set('licensePlate', plate)} error={fieldError('licensePlate')} />
        <div className={styles.row}>
          <TextField
            label="Marke"
            data-autofocus
            placeholder="z. B. VW"
            hint="Marke oder Modell ist nötig"
            maxLength={100}
            autoComplete="off"
            value={values.make}
            onChange={(e) => set('make', e.target.value)}
            error={fieldError('make')}
          />
          <TextField
            label="Modell"
            placeholder="z. B. Golf"
            maxLength={100}
            autoComplete="off"
            value={values.model}
            onChange={(e) => set('model', e.target.value)}
            error={fieldError('model')}
          />
        </div>
        <div className={styles.row}>
          <TextField
            label="1. Inverkehrsetzung"
            type="date"
            value={values.firstRegistration}
            onChange={(e) => set('firstRegistration', e.target.value)}
            error={fieldError('firstRegistration')}
          />
          <TextField
            label="Letzte MFK"
            type="date"
            hint="Für die MFK-Warnung"
            value={values.lastMfk}
            onChange={(e) => set('lastMfk', e.target.value)}
            error={fieldError('lastMfk')}
          />
          <TextField
            label="Kilometerstand"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.mileageKm}
            onChange={(e) => set('mileageKm', e.target.value)}
            error={fieldError('mileageKm')}
          />
        </div>
      </form>
    </Modal>
  )
}
