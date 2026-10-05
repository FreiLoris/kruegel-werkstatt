import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { LicensePlateField } from '../../components/licenseplate/LicensePlateField'
import { Button } from '../../components/ui/Button'
import styles from '../../components/ui/FormDialog.module.css'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useCreateVehicle, useUpdateVehicle, type Vehicle, type VehicleRequest } from './vehicleApi'

/**
 * All fields of a vehicle – editing sends everything (PUT replaces the whole vehicle), so
 * nothing that is not on the form may get lost.
 */
interface FormValues {
  licensePlate: string
  make: string
  model: string
  vin: string
  firstRegistration: string
  modelYear: string
  mileageKm: string
  lastMfk: string
  color: string
  fuel: string
}

const EMPTY: FormValues = {
  licensePlate: '',
  make: '',
  model: '',
  vin: '',
  firstRegistration: '',
  modelYear: '',
  mileageKm: '',
  lastMfk: '',
  color: '',
  fuel: '',
}

function valuesOf(v: Vehicle): FormValues {
  return {
    licensePlate: v.licensePlate ?? '',
    make: v.make ?? '',
    model: v.model ?? '',
    vin: v.vin ?? '',
    firstRegistration: v.firstRegistration ?? '',
    modelYear: v.modelYear?.toString() ?? '',
    mileageKm: v.mileageKm?.toString() ?? '',
    lastMfk: v.lastMfk ?? '',
    color: v.color ?? '',
    fuel: v.fuel ?? '',
  }
}

function toRequest(customerId: string | null, values: FormValues, version?: number): VehicleRequest {
  const text = (value: string) => value.trim() || undefined
  const number = (value: string) => (value ? Number(value) : undefined)
  return {
    customerId: customerId ?? undefined,
    licensePlate: text(values.licensePlate),
    make: text(values.make),
    model: text(values.model),
    vin: text(values.vin),
    firstRegistration: values.firstRegistration || undefined,
    modelYear: number(values.modelYear),
    mileageKm: number(values.mileageKm),
    lastMfk: values.lastMfk || undefined,
    color: text(values.color),
    fuel: text(values.fuel),
    version,
  }
}

/**
 * Create a vehicle that is not in SwissGarage (e.g. a walk-in's car) or edit one – only LOCAL
 * vehicles, SwissGarage vehicles are changed in SwissGarage (ADR 0003).
 *
 * @param vehicle         to edit; without: a new vehicle of `customerId`
 * @param fromSwissGarage new vehicle of a SwissGarage customer → hint: the car will probably come
 *                        with the next import, then "Fahrzeug noch offen" avoids a duplicate
 */
export function VehicleDialog({
  vehicle,
  customerId,
  fromSwissGarage = false,
  onSaved,
  onClose,
}: {
  vehicle?: Vehicle
  customerId: string | null
  fromSwissGarage?: boolean
  onSaved: (vehicle: Vehicle) => void
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const create = useCreateVehicle()
  const update = useUpdateVehicle()
  const save = vehicle ? update : create
  // the version as it was when the dialog opened – a live update must not hide a change from another device
  const [openedVersion] = useState(vehicle?.version)
  const [values, setValues] = useState(() => (vehicle ? valuesOf(vehicle) : EMPTY))

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const callbacks = {
      onSuccess: (saved: Vehicle) => {
        toast.success(`${saved.description} ${vehicle ? 'gespeichert' : 'erfasst'}`)
        onSaved(saved)
      },
      onError: (error: Error) => {
        if (error instanceof ApiError && error.isConflict) {
          toast.error('Das Fahrzeug wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.')
          onClose()
        } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
          toast.error(`Speichern fehlgeschlagen: ${error.message}`)
        }
      },
    }
    if (vehicle) {
      update.mutate({ id: vehicle.id, request: toRequest(vehicle.customerId, values, openedVersion) }, callbacks)
    } else {
      create.mutate(toRequest(customerId, values), callbacks)
    }
  }

  const text = (field: keyof FormValues, label: string, extra: Partial<Parameters<typeof TextField>[0]> = {}) => (
    <TextField
      label={label}
      autoComplete="off"
      maxLength={100}
      value={values[field]}
      onChange={(e) => set(field, e.target.value)}
      error={fieldError(field)}
      {...extra}
    />
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={vehicle ? `${vehicle.description} bearbeiten` : 'Neues Fahrzeug'}
      wide
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            {vehicle ? 'Speichern' : 'Fahrzeug erfassen'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        {!vehicle && fromSwissGarage && (
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
            autoComplete="off"
            maxLength={100}
            value={values.make}
            onChange={(e) => set('make', e.target.value)}
            error={fieldError('make')}
          />
          {text('model', 'Modell', { placeholder: 'z. B. Golf' })}
          {text('vin', 'Chassis-Nr.', { maxLength: 100 })}
        </div>
        <div className={styles.row}>
          {text('firstRegistration', '1. Inverkehrsetzung', { type: 'date' })}
          {text('modelYear', 'Jahrgang', { type: 'number', min: 1900, max: 2100, inputMode: 'numeric' })}
          {text('mileageKm', 'Kilometerstand', { type: 'number', min: 0, inputMode: 'numeric' })}
        </div>
        <div className={styles.row}>
          {text('lastMfk', 'Letzte MFK', { type: 'date', hint: 'Für die MFK-Warnung' })}
          {text('color', 'Farbe')}
          {text('fuel', 'Treibstoff', { placeholder: 'z. B. Benzin' })}
        </div>
      </form>
    </Modal>
  )
}
