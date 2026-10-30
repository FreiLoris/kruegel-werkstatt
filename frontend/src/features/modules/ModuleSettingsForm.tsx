import { useId, useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import styles from '../tire-hotel/TireHotel.module.css'
import { useModuleSettings, useSaveModuleSettings, type AppModule, type ModuleSettings } from './moduleApi'

/** Which parts of the app the workshop uses (neutral 3) – one setting for all devices. */
export function ModuleSettingsForm() {
  const { data: settings, error } = useModuleSettings()
  // not the version as key: a change from another device would remount the form and throw away the ticks
  return settings ? (
    <ModulesForm settings={settings} />
  ) : (
    <p className="muted">{error ? `Einstellung konnte nicht geladen werden: ${error.message}` : 'Lade …'}</p>
  )
}

function offOf(settings: ModuleSettings): ReadonlySet<AppModule> {
  return new Set(settings.modules.filter((m) => !m.on).map((m) => m.module))
}

function ModulesForm({ settings }: { settings: ModuleSettings }) {
  const formId = useId()
  const canEdit = useCanEdit()
  const toast = useToast()
  const save = useSaveModuleSettings()
  // the version and the ticks as they were when the form opened (conventions) – updated by this device's own save
  const [openedVersion, setOpenedVersion] = useState(settings.version)
  const [opened, setOpened] = useState(() => offOf(settings))
  const [off, setOff] = useState(opened)

  const changed = off.size !== opened.size || [...off].some((module) => !opened.has(module))
  useUnsavedChanges(changed)

  function toggle(module: AppModule, on: boolean) {
    const next = new Set(off)
    if (on) next.delete(module)
    else next.add(module)
    setOff(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { off: [...off], version: openedVersion },
      {
        onSuccess: (saved) => {
          const now = offOf(saved)
          setOpenedVersion(saved.version)
          setOpened(now)
          setOff(now)
          toast.success('Module gespeichert')
        },
        onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <>
      <h2>Module</h2>
      <p className="muted">
        Was der Betrieb nicht braucht, lässt sich ausschalten – es verschwindet aus dem Menü, den Einstellungen und den Aufträgen. Die
        Daten bleiben und sind nach dem Einschalten wieder da.
      </p>
      <form id={formId} onSubmit={submit}>
        {settings.modules.map((m) => (
          <Checkbox
            key={m.module}
            label={`${m.title} – ${m.description}`}
            disabled={!canEdit}
            checked={!off.has(m.module)}
            onChange={(e) => toggle(m.module, e.target.checked)}
          />
        ))}
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
