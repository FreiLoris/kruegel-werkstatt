import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { useSaveTreadLimits, useTreadLimits, type TreadLimits } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { parseDepth } from './tireSetForm'

/**
 * When a tread depth is worth a word with the customer (FB-07): the limits for summer and winter
 * tyres (all-season like winter) and the legal minimum.
 */
export function TreadLimitsSettings() {
  const { data: limits, error } = useTreadLimits()
  if (error) return <p className="muted">Profilgrenzen konnten nicht geladen werden: {error.message}</p>
  if (!limits) return <p className="muted">Lade Profilgrenzen …</p>
  return <LimitsForm key={limits.version} limits={limits} />
}

const text = (mm: number) => mm.toFixed(1).replace('.', ',')

function LimitsForm({ limits }: { limits: TreadLimits }) {
  const formId = useId()
  const canEdit = useCanEdit()
  const toast = useToast()
  const save = useSaveTreadLimits()
  const [values, setValues] = useState({ summer: text(limits.summerMm), winter: text(limits.winterMm), minimum: text(limits.minimumMm) })

  const parsed = { summer: parseDepth(values.summer), winter: parseDepth(values.winter), minimum: parseDepth(values.minimum) }
  const invalid = (value: number | null) => value === null || Number.isNaN(value) || value <= 0 || value > 20
  const fieldError = (field: string, value: number | null) =>
    invalid(value) ? 'in mm, z. B. 4,0' : save.error instanceof ApiError ? save.error.messageForField(field) : undefined
  const changed = values.summer !== text(limits.summerMm) || values.winter !== text(limits.winterMm) || values.minimum !== text(limits.minimumMm)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (invalid(parsed.summer) || invalid(parsed.winter) || invalid(parsed.minimum)) return
    save.mutate(
      { summerMm: parsed.summer!, winterMm: parsed.winter!, minimumMm: parsed.minimum!, version: limits.version },
      {
        onSuccess: () => toast.success('Profilgrenzen gespeichert'),
        onError: (error) => {
          if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) toast.error(`Nicht gespeichert: ${reasonOf(error)}`)
        },
      },
    )
  }

  return (
    <>
      <h2>Pneuhotel – Profilgrenzen</h2>
      <p className="muted">Darunter zeigt das Pneuhotel «ansprechen»: Kunde auf neue Reifen ansprechen. Ganzjahresreifen zählen wie Winterreifen.</p>
      <form id={formId} className={styles.row} onSubmit={submit}>
        <TextField
          label="Sommer (mm)"
          inputMode="decimal"
          disabled={!canEdit}
          value={values.summer}
          onChange={(e) => setValues({ ...values, summer: e.target.value })}
          error={fieldError('summerMm', parsed.summer)}
        />
        <TextField
          label="Winter / Ganzjahr (mm)"
          inputMode="decimal"
          disabled={!canEdit}
          value={values.winter}
          onChange={(e) => setValues({ ...values, winter: e.target.value })}
          error={fieldError('winterMm', parsed.winter)}
        />
        <TextField
          label="Gesetzliches Minimum (mm)"
          inputMode="decimal"
          disabled={!canEdit}
          value={values.minimum}
          onChange={(e) => setValues({ ...values, minimum: e.target.value })}
          error={fieldError('minimumMm', parsed.minimum)}
        />
      </form>
      {canEdit && (
        <p>
          <Button variant="primary" type="submit" form={formId} disabled={!changed} loading={save.isPending}>
            Speichern
          </Button>
        </p>
      )}
    </>
  )
}
