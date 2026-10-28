import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { IDLE_MODES, isIdleMode, setIdleMode, useIdleMode, type IdleMode } from '../../lib/deviceIdleMode'
import { useToast } from '../../components/ui/toastContext'
import styles from '../tire-hotel/TireHotel.module.css'
import { useSaveScreenLockSettings, useScreenLockSettings, type ScreenLockSettings } from './screenLockApi'

/** The most the server takes (ScreenLockSettings.MAX_MINUTES) */
const MAX_LOCK_MINUTES = 120

/** After how many minutes without use a device asks who is at it (FB-29) – one setting for all devices. */
export function ScreenLockSettingsForm() {
  const { data: settings, error } = useScreenLockSettings()
  return (
    <>
      {/* not the version as key: a change from another device would remount the form and throw away the input */}
      {settings ? (
        <MinutesForm settings={settings} />
      ) : (
        <p className="muted">{error ? `Einstellung konnte nicht geladen werden: ${error.message}` : 'Lade …'}</p>
      )}
      {/* stored on the device – also without the server */}
      <DeviceIdleMode />
    </>
  )
}

function MinutesForm({ settings }: { settings: ScreenLockSettings }) {
  const formId = useId()
  const canEdit = useCanEdit()
  const toast = useToast()
  const save = useSaveScreenLockSettings()
  // the version as it was when the form opened (conventions) – updated by this device's own save
  const [openedVersion, setOpenedVersion] = useState(settings.version)
  const [minutes, setMinutes] = useState(String(settings.lockMinutes))

  const value = /^\d{1,3}$/.test(minutes.trim()) ? Number(minutes.trim()) : null
  const invalid = value === null || value > MAX_LOCK_MINUTES
  const changed = minutes.trim() !== String(settings.lockMinutes)
  useUnsavedChanges(changed)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (invalid) return
    save.mutate(
      { lockMinutes: value, version: openedVersion },
      {
        onSuccess: (saved) => {
          setOpenedVersion(saved.version)
          setMinutes(String(saved.lockMinutes))
          toast.success('Bildschirmsperre gespeichert')
        },
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) toast.error(`Nicht gespeichert: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <>
      <h2>Bildschirmsperre</h2>
      <p className="muted">
        Nach so vielen Minuten ohne Bedienung fragt ein Gerät wieder, wer am Gerät ist – angefangene Eingaben bleiben erhalten. Nicht auf
        Geräten «Nur ansehen» (Werkstatt-TV). 0 = nie. Was das einzelne Gerät dann tut, steht darunter – das Werkstatt-Tablet fällt still
        auf «Nur ansehen» zurück (Angefangenes bleibt stehen, gespeichert wird nach dem Wechsel auf die eigene Person).
      </p>
      <form id={formId} className={styles.row} onSubmit={submit}>
        <TextField
          label="Minuten ohne Bedienung"
          inputMode="numeric"
          maxLength={3}
          disabled={!canEdit}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          error={invalid ? `0 bis ${MAX_LOCK_MINUTES}` : save.error instanceof ApiError ? save.error.messageForField('lockMinutes') : undefined}
        />
      </form>
      {canEdit && (
        <div className={styles.formActions}>
          <Button variant="primary" type="submit" form={formId} disabled={!changed} loading={save.isPending}>
            Speichern
          </Button>
        </div>
      )}
    </>
  )
}

/**
 * Per device (FB-29): the office PC locks, the shared workshop tablet falls back to "Nur ansehen"
 * silently. Stored on the device itself. A device on "Nur ansehen" has no "Einstellungen" in its menu –
 * it is set while a person is chosen, or via /settings.
 */
function DeviceIdleMode() {
  const mode = useIdleMode()
  return (
    <div className={styles.row}>
      <Select label="Dieses Gerät nach der Zeit ohne Bedienung" value={mode} onChange={(e) => isIdleMode(e.target.value) && setIdleMode(e.target.value)}>
        {(Object.keys(IDLE_MODES) as IdleMode[]).map((value) => (
          <option key={value} value={value}>
            {IDLE_MODES[value]}
          </option>
        ))}
      </Select>
    </div>
  )
}
