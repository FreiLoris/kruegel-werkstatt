import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatDeadline, parseDeadline } from './seasonChange'
import styles from './TireHotel.module.css'
import { useSaveSeasonSettings, useSeasonSettings, type SeasonSettings } from './tireSeasonApi'

/** By when the tyres should be changed (FB-21) – the season change overview counts with these. */
export function SeasonDeadlineSettings() {
  const { data: settings, error } = useSeasonSettings()
  if (!settings) return <p className="muted">{error ? `Stichtage konnten nicht geladen werden: ${error.message}` : 'Lade Stichtage …'}</p>
  // not the version as key: a change from another device would remount the form and throw away the input
  return <DeadlineForm settings={settings} />
}

function DeadlineForm({ settings }: { settings: SeasonSettings }) {
  const formId = useId()
  const canEdit = useCanEdit()
  const toast = useToast()
  const save = useSaveSeasonSettings()
  // the version as it was when the form opened (conventions) – updated by this device's own save
  const [openedVersion, setOpenedVersion] = useState(settings.version)
  const [values, setValues] = useState({ summer: formatDeadline(settings.summerDeadline), winter: formatDeadline(settings.winterDeadline) })

  const parsed = { summer: parseDeadline(values.summer), winter: parseDeadline(values.winter) }
  const fieldError = (field: string, value: string | null | undefined) =>
    !value ? 'Tag und Monat, z. B. 1.6.' : save.error instanceof ApiError ? save.error.messageForField(field) : undefined
  const sameDay = !!parsed.summer && parsed.summer === parsed.winter
  const changed = values.summer !== formatDeadline(settings.summerDeadline) || values.winter !== formatDeadline(settings.winterDeadline)
  useUnsavedChanges(changed)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!parsed.summer || !parsed.winter || sameDay) return
    save.mutate(
      { summerDeadline: parsed.summer, winterDeadline: parsed.winter, version: openedVersion },
      {
        onSuccess: (saved) => {
          setOpenedVersion(saved.version)
          setValues({ summer: formatDeadline(saved.summerDeadline), winter: formatDeadline(saved.winterDeadline) })
          toast.success('Stichtage gespeichert')
        },
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) toast.error(`Nicht gespeichert: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <>
      <h2>Pneuhotel – Stichtage Saisonwechsel</h2>
      <p className="muted">
        Bis dahin sollte gewechselt sein. Wer danach im «Saisonwechsel» noch offen ist, gilt als vergessen. Gewechselt zählt jeweils ab dem
        Stichtag der anderen Saison.
      </p>
      <form id={formId} className={styles.row} onSubmit={submit}>
        <TextField
          label="Sommerreifen bis"
          placeholder="1.6."
          disabled={!canEdit}
          value={values.summer}
          onChange={(e) => setValues({ ...values, summer: e.target.value })}
          error={fieldError('summerDeadline', parsed.summer)}
        />
        <TextField
          label="Winterreifen bis"
          placeholder="1.12."
          disabled={!canEdit}
          value={values.winter}
          onChange={(e) => setValues({ ...values, winter: e.target.value })}
          error={sameDay ? 'ein anderer Tag als für Sommerreifen' : fieldError('winterDeadline', parsed.winter)}
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
