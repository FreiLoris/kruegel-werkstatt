import { PowerOff } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatDuration } from '../../lib/format'
import { MFK_DEFAULT_MINUTES, MFK_DURATIONS } from '../tasks/wizard/appointmentForm'
import styles from './InspectionStationSettings.module.css'
import { useSaveInspectionStation, useSetInspectionStationActive, type InspectionStation } from './inspectionStationApi'

interface FormValues {
  name: string
  address: string
  phone: string
  minutes: string
}

/** Create and edit an inspection station (FB-10). Mounted fresh on every open (`key`). */
export function InspectionStationDialog({ station, onClose }: { station?: InspectionStation; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveInspectionStation()
  const setActive = useSetInspectionStationActive()
  const [values, setValues] = useState<FormValues>({
    name: station?.name ?? '',
    address: station?.address ?? '',
    phone: station?.phone ?? '',
    minutes: String(station?.minutes ?? MFK_DEFAULT_MINUTES),
  })
  // a duration saved before that is not in the list stays choosable
  const durations = MFK_DURATIONS.includes(Number(values.minutes)) ? MFK_DURATIONS : [...MFK_DURATIONS, Number(values.minutes)].sort((a, b) => a - b)

  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set(field: keyof FormValues, value: string) {
    setValues({ ...values, [field]: value })
    // An old error message disappears as soon as something is corrected
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const request = {
      name: values.name.trim(),
      address: values.address.trim() || undefined,
      phone: values.phone.trim() || undefined,
      minutes: Number(values.minutes),
      version: station?.version,
    }
    save.mutate(
      { id: station?.id, request },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.name} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error(`${station?.name} wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
            // Field errors appear at the field – everything else as a message
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  async function stopUsing() {
    if (!station) return
    const ok = await confirm({
      title: `${station.name} nicht mehr verwenden?`,
      text: `${station.name} ist bei neuen Aufträgen nicht mehr wählbar. Bisherige Aufträge behalten sie. Unter «Nicht mehr verwendet» lässt sich das rückgängig machen.`,
      confirmLabel: 'Nicht mehr verwenden',
    })
    if (!ok) return
    setActive.mutate(
      { id: station.id, active: false },
      {
        onSuccess: () => {
          toast.success(`${station.name} wird nicht mehr verwendet`)
          onClose()
        },
        onError: (error) => toast.error(`${station.name}: ${error.message}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={station ? `${station.name} bearbeiten` : 'Neue Prüfstelle'}
      footer={
        <>
          {/* the standard stays in use – another one becomes the standard first */}
          {station?.active && !station.standard && (
            <Button variant="ghost" icon={PowerOff} onClick={stopUsing} loading={setActive.isPending} className={styles.left}>
              Nicht mehr verwenden
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
          label="Name"
          required
          placeholder="z. B. Strassenverkehrsamt Musterhausen"
          maxLength={100}
          autoComplete="off"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
        />
        <TextField
          label="Adresse"
          placeholder="z. B. Musterstrasse 1, 8000 Musterhausen"
          maxLength={200}
          autoComplete="off"
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
          error={fieldError('address')}
        />
        <TextField
          label="Telefon"
          type="tel"
          maxLength={40}
          autoComplete="off"
          value={values.phone}
          onChange={(e) => set('phone', e.target.value)}
          error={fieldError('phone')}
        />
        <Select
          label="Dauer inkl. Fahrt"
          hint="Hin, Prüfung und zurück – so lange steht der MFK-Termin im Kalender. Im Auftrag änderbar."
          value={values.minutes}
          onChange={(e) => set('minutes', e.target.value)}
          error={fieldError('minutes')}
        >
          {durations.map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {formatDuration(minutes)}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  )
}
