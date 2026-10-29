import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { Button } from '../../components/ui/Button'
import { Checkbox, TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import styles from '../tire-hotel/TireHotel.module.css'
import { useReminderSettings, useSaveReminderSettings, type ReminderSettings } from './reminderApi'

/** Customers reminded of their appointment the working day before (17a) – one setting for all devices. */
export function ReminderSettingsForm() {
  const { data: settings, error } = useReminderSettings()
  // not the version as key: a change from another device would remount the form and throw away the input
  return settings ? (
    <SettingsForm settings={settings} />
  ) : (
    <p className="muted">{error ? `Einstellung konnte nicht geladen werden: ${error.message}` : 'Lade …'}</p>
  )
}

function SettingsForm({ settings }: { settings: ReminderSettings }) {
  const formId = useId()
  const canEdit = useCanEdit()
  const toast = useToast()
  const save = useSaveReminderSettings()
  // the version as it was when the form opened (conventions) – updated by this device's own save
  const [openedVersion, setOpenedVersion] = useState(settings.version)
  const [enabled, setEnabled] = useState(settings.enabled)
  const [sendTime, setSendTime] = useState(settings.sendTime.slice(0, 5))

  const invalid = !/^\d{2}:\d{2}$/.test(sendTime) || sendTime < '08:00' || sendTime > '19:00'
  const changed = enabled !== settings.enabled || sendTime !== settings.sendTime.slice(0, 5)
  useUnsavedChanges(changed)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (invalid) return
    save.mutate(
      { enabled, sendTime, version: openedVersion },
      {
        onSuccess: (saved) => {
          setOpenedVersion(saved.version)
          setEnabled(saved.enabled)
          setSendTime(saved.sendTime.slice(0, 5))
          toast.success(saved.enabled ? 'Erinnerungen eingeschaltet' : 'Erinnerungen ausgeschaltet')
        },
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) toast.error(`Nicht gespeichert: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <>
      <h2>Kundenerinnerungen</h2>
      <p className="muted">
        Am Werktag vor dem Termin bekommt der Kunde ab der eingestellten Zeit eine SMS – ohne Handynummer eine E-Mail. Am Freitag gleich
        für Samstag bis Montag. Nicht erinnert wird, wer keine will, wessen Auftrag «nicht erinnern» hat, wessen Fahrzeug schon hier ist
        und wer den Termin erst heute bekommen hat. Hat ein Kunde weder Handy noch E-Mail, sagt es der Auftrag schon beim Erfassen: dann bitte am Vortag anrufen.
      </p>
      <form id={formId} onSubmit={submit}>
        <Checkbox label="Kunden am Vortag erinnern" disabled={!canEdit} checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <div className={styles.row}>
          <TextField
            label="Senden ab"
            type="time"
            step={900}
            disabled={!canEdit}
            value={sendTime}
            onChange={(e) => setSendTime(e.target.value)}
            error={invalid ? 'zwischen 08:00 und 19:00' : save.error instanceof ApiError ? save.error.messageForField('sendTime') : undefined}
          />
        </div>
      </form>
      <ul className="muted">
        <li>SMS: {settings.smsReady ? 'eingerichtet' : 'auf diesem Server nicht eingerichtet – SMS werden nur protokolliert'}</li>
        <li>E-Mail: {settings.emailReady ? 'eingerichtet' : 'auf diesem Server nicht eingerichtet – E-Mails werden nur protokolliert'}</li>
      </ul>
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
