import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError, reasonOf } from '../../api/errors'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Checkbox, Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatTime } from '../../lib/format'
import type { Employee } from '../employees/employeeApi'
import {
  ABSENCE_CATEGORY,
  entryNoun,
  useCreateSeries,
  useDeleteAbsence,
  useDeleteSeries,
  useSaveAbsence,
  useSeriesPreview,
  useUpdateSeries,
  type Absence,
  type AbsenceCategory,
  type AbsenceRequest,
  type AbsenceSeriesPlan,
  type AbsenceSeriesRequest,
  type SeriesScope,
  type Weekday,
} from './absenceApi'
import styles from './AbsenceDialog.module.css'
import { planSummary, SERIES_SCOPE, SERIES_WEEKDAYS, skippedDays, toPlanRequest, toSeriesRequest, withWeekday } from './absenceSeries'
import { CATEGORY_CLASS } from './categoryColors'

/** Form state: dates as "2026-10-15", empty text = not set */
interface FormValues {
  employeeId: string
  category: AbsenceCategory
  company: string
  note: string
  startDate: string
  startsAfternoon: boolean
  /** "09:00", empty = whole day (not for vacation, FB-05) */
  startTime: string
  endDate: string
  endsNoon: boolean
  endTime: string
}

/** What a dragged-open period brings along */
export interface NewAbsence {
  employeeId: string
  startDate: string
  endDate: string
  /** preset – "Ferien" without it */
  category?: AbsenceCategory
}

function initialValues(absence: Absence | undefined, fresh: NewAbsence | undefined): FormValues {
  return {
    employeeId: absence?.employeeId ?? fresh?.employeeId ?? '',
    category: absence?.category ?? fresh?.category ?? 'VACATION',
    company: absence?.company ?? '',
    note: absence?.note ?? '',
    startDate: absence?.startDate ?? fresh?.startDate ?? '',
    startsAfternoon: absence?.startsAfternoon ?? false,
    startTime: absence?.startTime ? formatTime(absence.startTime) : '',
    endDate: absence?.endDate ?? fresh?.endDate ?? '',
    endsNoon: absence?.endsNoon ?? false,
    endTime: absence?.endTime ? formatTime(absence.endTime) : '',
  }
}

/** One day cannot be "only afternoon" AND "only morning" – then "only morning" does not count */
const endsNoonCounts = (values: FormValues, repeat = false) =>
  // in a series every day is one day
  values.endsNoon && !((repeat || values.startDate === values.endDate) && values.startsAfternoon)

/**
 * FB-05: vacation in half days (the statistics count them), everything else with optional times –
 * what does not belong to the category is not sent.
 */
function toRequest(values: FormValues, version?: number): AbsenceRequest {
  const vacation = values.category === 'VACATION'
  return {
    employeeId: values.employeeId,
    category: values.category,
    // the server drops it for the other categories anyway – sending none is clearer
    company: values.category === 'EXTERNAL_WORK' ? values.company.trim() || undefined : undefined,
    note: values.note.trim() || undefined,
    startDate: values.startDate,
    startsAfternoon: vacation && values.startsAfternoon,
    startTime: vacation ? null : values.startTime || null,
    endDate: values.endDate,
    endsNoon: vacation && endsNoonCounts(values),
    endTime: vacation ? null : values.endTime || null,
    version,
  }
}

/**
 * Enter or change an absence: person, category, period – vacation with half days, everything else
 * with optional times (FB-05: a doctor 9:00–10:30) –, company for external work. Without edit rights the same dialog only shows it. Mounted fresh on every open (`key`).
 */
export function AbsenceDialog({
  absence,
  fresh,
  employees,
  readOnly,
  onClose,
}: {
  /** the absence to change – or `fresh` for a new one */
  absence?: Absence
  fresh?: NewAbsence
  /** who can be chosen: the active people (plus the person of the absence, even if they left) */
  employees: Employee[]
  readOnly: boolean
  onClose: () => void
}) {
  const formId = useId()
  const toast = useToast()
  const confirm = useConfirm()
  const save = useSaveAbsence()
  const remove = useDeleteAbsence()
  const createSeries = useCreateSeries()
  const updateSeries = useUpdateSeries()
  const removeSeries = useDeleteSeries()
  const [values, setValues] = useState(() => initialValues(absence, fresh))
  // FB-33: a new entry can repeat on weekdays; a day of a series is changed for the day, from it on or all
  const [repeat, setRepeat] = useState(false)
  const [weekdays, setWeekdays] = useState<Weekday[]>([])
  const [everyOtherWeek, setEveryOtherWeek] = useState(false)
  const [scope, setScope] = useState<SeriesScope>('DAY')
  const inSeries = !!absence?.seriesId
  const seriesRequest = !absence && repeat ? toSeriesRequest({ ...values, weekdays, everyOtherWeek }) : null
  // the preview asks once typing pauses – and only for what changes the days (not company and note)
  const planText = useDebouncedValue(JSON.stringify(!absence && repeat ? toPlanRequest({ ...values, weekdays, everyOtherWeek }) : null))
  const preview = useSeriesPreview(JSON.parse(planText) as AbsenceSeriesRequest | null)

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? 'Unbekannt'
  const error = save.error ?? createSeries.error ?? updateSeries.error
  const messageFor = (field: string) => (error instanceof ApiError ? error.messageForField(field) : undefined)
  // a series names its period "from"/"to" – shown at the same date fields
  const fieldError = (field: string) =>
    messageFor(field) ?? (field === 'startDate' ? messageFor('from') : field === 'endDate' ? messageFor('to') : undefined)

  function resetErrors() {
    // an old error message disappears as soon as something is corrected
    if (save.error) save.reset()
    if (createSeries.error) createSeries.reset()
    if (updateSeries.error) updateSeries.reset()
  }

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    resetErrors()
  }

  function toggleWeekday(day: Weekday) {
    setWeekdays((current) => withWeekday(current, day))
    resetErrors()
  }

  /** For more days of a series each keeps its own dates – edited ones go back */
  function chooseScope(value: SeriesScope) {
    setScope(value)
    if (absence && value !== 'DAY') setValues((current) => ({ ...current, startDate: absence.startDate, endDate: absence.endDate }))
    resetErrors()
  }

  /** Field errors appear at the field – everything else as a message */
  function showError(error: Error) {
    if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!absence && repeat) {
      if (!seriesRequest) {
        toast.error(weekdays.length === 0 ? 'Bitte mindestens einen Wochentag wählen.' : 'Bitte Person, Zeitraum und ggf. Firma angeben.')
        return
      }
      createSeries.mutate(seriesRequest, {
        onSuccess: (plan) => {
          toast.success(`${nameOf(values.employeeId)}: ${ABSENCE_CATEGORY[values.category]} an ${plan.days.length} Tagen gespeichert`)
          onClose()
        },
        onError: showError,
      })
      return
    }
    if (absence && inSeries && scope !== 'DAY') {
      updateSeries.mutate(
        { id: absence.id, scope, request: toRequest(values, absence.version) },
        {
          onSuccess: (days) => {
            toast.success(`${nameOf(values.employeeId)}: ${days.length === 1 ? '1 Tag' : `${days.length} Tage`} der Serie geändert`)
            onClose()
          },
          onError: (error) => {
            if (error instanceof ApiError && error.isVersionConflict) {
              toast.error(`Dieser Eintrag wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
              onClose()
            } else {
              showError(error)
            }
          },
        },
      )
      return
    }
    save.mutate(
      { id: absence?.id, request: toRequest(values, absence?.version) },
      {
        onSuccess: (saved) => {
          toast.success(`${nameOf(saved.employeeId)}: ${ABSENCE_CATEGORY[saved.category]} gespeichert`)
          onClose()
        },
        onError: (error) => {
          // Only an existing entry can have been changed elsewhere; a 409 for a new one is a rule
          // (e.g. overlap entered on another device just now) – keep the input, show the server's reason
          if (absence && error instanceof ApiError && error.isVersionConflict) {
            toast.error(`Dieser Eintrag wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else {
            showError(error)
          }
        },
      },
    )
  }

  async function deleteIt() {
    if (!absence) return
    const days =
      inSeries && scope !== 'DAY'
        ? scope === 'ALL'
          ? 'alle Tage dieser Serie'
          : `alle Tage dieser Serie ab ${formatDate(absence.startDate)}`
        : `vom ${formatDate(absence.startDate)} bis ${formatDate(absence.endDate)}`
    const ok = await confirm({
      title: `${entryNoun(absence.category)} löschen?`,
      text: `${nameOf(absence.employeeId)}: ${ABSENCE_CATEGORY[absence.category]} ${days}. Das lässt sich nicht rückgängig machen.`,
      confirmLabel: 'Löschen',
      dangerous: true,
    })
    if (!ok) return
    if (inSeries) {
      removeSeries.mutate(
        { id: absence.id, scope },
        {
          onSuccess: () => {
            toast.success(`${entryNoun(absence.category)} gelöscht`)
            onClose()
          },
          onError: (error) => toast.error(`Nicht gelöscht: ${error.message}`),
        },
      )
      return
    }
    remove.mutate(absence.id, {
      onSuccess: () => {
        toast.success(`${entryNoun(absence.category)} gelöscht`)
        onClose()
      },
      onError: (error) => toast.error(`Nicht gelöscht: ${error.message}`),
    })
  }

  const title = readOnly ? `${nameOf(values.employeeId)}: ${ABSENCE_CATEGORY[values.category]}` : `${entryNoun(values.category)} ${absence ? 'bearbeiten' : 'erfassen'}`

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        readOnly ? (
          <Button onClick={onClose}>Schliessen</Button>
        ) : (
          <>
            {absence && (
              <Button variant="ghost" icon={Trash2} onClick={deleteIt} loading={remove.isPending || removeSeries.isPending} className={styles.left}>
                Löschen
              </Button>
            )}
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" type="submit" form={formId} loading={save.isPending || createSeries.isPending || updateSeries.isPending}>
              Speichern
            </Button>
          </>
        )
      }
    >
      <form id={formId} onSubmit={submit}>
        {/* without edit rights everything is shown, nothing can be changed */}
        <fieldset className={styles.form} disabled={readOnly}>
          <Select label="Person" required value={values.employeeId} onChange={(e) => set('employeeId', e.target.value)} error={fieldError('employeeId')}>
            <option value="" disabled>
              Bitte wählen …
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>

          <div role="radiogroup" aria-label="Art" className={styles.categories}>
            {(Object.keys(ABSENCE_CATEGORY) as AbsenceCategory[]).map((category) => (
              <label key={category} className={[styles.category, CATEGORY_CLASS[category]].join(' ')}>
                <input type="radio" name="category" value={category} checked={values.category === category} onChange={() => set('category', category)} />
                {ABSENCE_CATEGORY[category]}
              </label>
            ))}
          </div>

          {values.category === 'EXTERNAL_WORK' && (
            <TextField
              label="Firma"
              required
              placeholder="z. B. Garage Muster AG"
              maxLength={100}
              autoComplete="off"
              value={values.company}
              onChange={(e) => set('company', e.target.value)}
              error={fieldError('company')}
            />
          )}

          <div className={styles.period}>
            <div className={styles.day}>
              <TextField
                label={repeat ? 'Erster Tag' : 'Von'}
                type="date"
                required
                disabled={inSeries && scope !== 'DAY'}
                value={values.startDate}
                onChange={(e) => {
                  const startDate = e.target.value
                  // a start after the end moves the end along (one-day absences are the usual case)
                  setValues((current) => ({ ...current, startDate, endDate: current.endDate < startDate ? startDate : current.endDate }))
                  resetErrors()
                }}
                error={fieldError('startDate')}
              />
              {values.category === 'VACATION' ? (
                <Checkbox label={repeat ? 'jeweils erst ab Mittag' : 'erst ab Mittag'} checked={values.startsAfternoon} onChange={(e) => set('startsAfternoon', e.target.checked)} />
              ) : (
                <TextField
                  label="ab Uhrzeit"
                  type="time"
                  hint="Leer = ganzer Tag"
                  value={values.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                  error={fieldError('startTime')}
                />
              )}
            </div>
            <div className={styles.day}>
              <TextField
                label={repeat ? 'Letzter Tag' : 'Bis'}
                type="date"
                required
                disabled={inSeries && scope !== 'DAY'}
                min={values.startDate || undefined}
                value={values.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                error={fieldError('endDate')}
              />
              {values.category === 'VACATION' ? (
                <>
                  <Checkbox
                    label={repeat ? 'jeweils nur bis Mittag' : 'nur bis Mittag'}
                    checked={endsNoonCounts(values, repeat)}
                    disabled={(repeat || values.startDate === values.endDate) && values.startsAfternoon}
                    onChange={(e) => set('endsNoon', e.target.checked)}
                  />
                  {fieldError('endsNoon') && <p className={styles.error}>{fieldError('endsNoon')}</p>}
                </>
              ) : (
                <TextField
                  label="bis Uhrzeit"
                  type="time"
                  hint="Leer = ganzer Tag"
                  value={values.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  error={fieldError('endTime')}
                />
              )}
            </div>
          </div>

          {!absence && !readOnly && (
            <div className={styles.series}>
              <Checkbox
                label="Wiederholen – an bestimmten Wochentagen"
                checked={repeat}
                onChange={(e) => {
                  setRepeat(e.target.checked)
                  resetErrors()
                }}
              />
              {repeat && (
                <>
                  <div role="group" aria-label="Wochentage" className={styles.weekdays}>
                    {SERIES_WEEKDAYS.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        className={styles.weekday}
                        aria-pressed={weekdays.includes(day.value)}
                        aria-label={day.name}
                        onClick={() => toggleWeekday(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {fieldError('weekdays') && <p className={styles.error}>{fieldError('weekdays')}</p>}
                  <Checkbox
                    label="nur jede 2. Woche"
                    checked={everyOtherWeek}
                    onChange={(e) => {
                      setEveryOtherWeek(e.target.checked)
                      resetErrors()
                    }}
                  />
                  <SeriesPreview plan={planText !== 'null' ? preview.data : undefined} error={planText !== 'null' ? preview.error : null} />
                </>
              )}
            </div>
          )}

          {inSeries && !readOnly && (
            <fieldset className={styles.scope}>
              <legend className={styles.scopeLabel}>Gilt für</legend>
              {(Object.keys(SERIES_SCOPE) as SeriesScope[]).map((value) => (
                <label key={value}>
                  <input type="radio" name="scope" value={value} checked={scope === value} onChange={() => chooseScope(value)} />
                  {SERIES_SCOPE[value]}
                </label>
              ))}
              {scope !== 'DAY' && <p className="muted">Jeder Tag behält sein Datum.</p>}
            </fieldset>
          )}

          <TextField
            label="Bemerkung"
            placeholder={values.category === 'TRAINING' ? 'z. B. Kurs Hochvolt' : undefined}
            maxLength={500}
            autoComplete="off"
            value={values.note}
            onChange={(e) => set('note', e.target.value)}
            error={fieldError('note')}
          />
        </fieldset>
      </form>
    </Modal>
  )
}

/**
 * "Erstellt 39 Einträge vom … bis …" and the days left out – before saving (FB-33). The live region
 * is always there, only its content changes – so a screen reader hears the first count too.
 */
function SeriesPreview({ plan, error }: { plan: AbsenceSeriesPlan | undefined; error: Error | null }) {
  const skipped = plan ? skippedDays(plan) : []
  return (
    <div className={styles.preview} aria-live="polite">
      {error ? (
        <p className={styles.error}>Vorschau nicht möglich: {reasonOf(error)}</p>
      ) : !plan ? (
        <p className="muted">Wochentage und Zeitraum wählen – dann steht hier, welche Tage entstehen.</p>
      ) : (
        <>
          <strong>{planSummary(plan)}</strong>
          {skipped.length > 0 && (
            <>
              <span className="muted">Übersprungen:</span>
              <ul>
                {skipped.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
