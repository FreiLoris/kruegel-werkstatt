import { useId, useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatDate } from '../../lib/format'
import styles from '../tire-hotel/TireHotel.module.css'
import { usePublicHolidaySettings, useSavePublicHolidaySettings, type PublicHolidaySettings } from './publicHolidayApi'

type Rule = PublicHolidaySettings['holidays'][number]['rule']

/** Which public holidays the workshop has (neutral 2) – calendars, vacation days and reminders follow them. */
export function PublicHolidaySettingsForm() {
  const { data: settings, error } = usePublicHolidaySettings()
  // not the version as key: a change from another device would remount the form and throw away the ticks
  return settings ? (
    <HolidaysForm settings={settings} />
  ) : (
    <p className="muted">{error ? `Einstellung konnte nicht geladen werden: ${error.message}` : 'Lade …'}</p>
  )
}

function chosenOf(settings: PublicHolidaySettings): ReadonlySet<Rule> {
  return new Set(settings.holidays.filter((holiday) => holiday.chosen).map((holiday) => holiday.rule))
}

function HolidaysForm({ settings }: { settings: PublicHolidaySettings }) {
  const formId = useId()
  const canEdit = useCanEdit()
  const toast = useToast()
  const save = useSavePublicHolidaySettings()
  // the version and the ticks as they were when the form opened (conventions) – updated by this device's own save
  const [openedVersion, setOpenedVersion] = useState(settings.version)
  const [opened, setOpened] = useState(() => chosenOf(settings))
  const [chosen, setChosen] = useState(opened)

  const changed = chosen.size !== opened.size || [...chosen].some((rule) => !opened.has(rule))
  useUnsavedChanges(changed)

  function toggle(rule: Rule, on: boolean) {
    const next = new Set(chosen)
    if (on) next.add(rule)
    else next.delete(rule)
    setChosen(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { holidays: [...chosen], version: openedVersion },
      {
        onSuccess: (saved) => {
          const now = chosenOf(saved)
          setOpenedVersion(saved.version)
          setOpened(now)
          setChosen(now)
          toast.success('Feiertage gespeichert')
        },
        onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <>
      <h2>Feiertage</h2>
      <p className="muted">
        Die Feiertage des Betriebs – sie stehen in den Kalendern, zählen nicht als Ferientage und an ihnen gehen keine Erinnerungen
        raus. Das Datum ist das von diesem Jahr.
      </p>
      <form id={formId} onSubmit={submit}>
        {settings.holidays.map((holiday) => (
          <Checkbox
            key={holiday.rule}
            label={`${holiday.name} (${formatDate(holiday.date)})`}
            disabled={!canEdit}
            checked={chosen.has(holiday.rule)}
            onChange={(e) => toggle(holiday.rule, e.target.checked)}
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
