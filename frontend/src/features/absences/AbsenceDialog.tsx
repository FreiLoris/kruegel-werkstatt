import { Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Checkbox, Select, TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatDate } from '../../lib/format'
import type { Employee } from '../employees/employeeApi'
import { ABSENCE_CATEGORY, useDeleteAbsence, useSaveAbsence, type Absence, type AbsenceCategory, type AbsenceRequest } from './absenceApi'
import styles from './AbsenceDialog.module.css'
import { CATEGORY_CLASS } from './categoryColors'

/** Form state: dates as "2026-10-15", empty text = not set */
interface FormValues {
  employeeId: string
  category: AbsenceCategory
  company: string
  note: string
  startDate: string
  startsAfternoon: boolean
  endDate: string
  endsNoon: boolean
}

/** What a dragged-open period brings along */
export interface NewAbsence {
  employeeId: string
  startDate: string
  endDate: string
}

function initialValues(absence: Absence | undefined, fresh: NewAbsence | undefined): FormValues {
  return {
    employeeId: absence?.employeeId ?? fresh?.employeeId ?? '',
    category: absence?.category ?? 'VACATION',
    company: absence?.company ?? '',
    note: absence?.note ?? '',
    startDate: absence?.startDate ?? fresh?.startDate ?? '',
    startsAfternoon: absence?.startsAfternoon ?? false,
    endDate: absence?.endDate ?? fresh?.endDate ?? '',
    endsNoon: absence?.endsNoon ?? false,
  }
}

/** One day cannot be "only afternoon" AND "only morning" – then "only morning" does not count */
const endsNoonCounts = (values: FormValues) => values.endsNoon && !(values.startDate === values.endDate && values.startsAfternoon)

function toRequest(values: FormValues, version?: number): AbsenceRequest {
  return {
    employeeId: values.employeeId,
    category: values.category,
    // the server drops it for the other categories anyway – sending none is clearer
    company: values.category === 'EXTERNAL_WORK' ? values.company.trim() || undefined : undefined,
    note: values.note.trim() || undefined,
    startDate: values.startDate,
    startsAfternoon: values.startsAfternoon,
    endDate: values.endDate,
    endsNoon: endsNoonCounts(values),
    version,
  }
}

/**
 * Enter or change an absence: person, category, period with half days, company for external
 * work. Without edit rights the same dialog only shows it. Mounted fresh on every open (`key`).
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
  const [values, setValues] = useState(() => initialValues(absence, fresh))

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? 'Unbekannt'
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.messageForField(field) : undefined)

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    // an old error message disappears as soon as something is corrected
    if (save.error) save.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { id: absence?.id, request: toRequest(values, absence?.version) },
      {
        onSuccess: (saved) => {
          toast.success(`${nameOf(saved.employeeId)}: ${ABSENCE_CATEGORY[saved.category]} gespeichert`)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.isConflict) {
            toast.error(`Diese Abwesenheit wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.`)
            onClose()
          } else if (!(error instanceof ApiError && (error.problem.errors?.length ?? 0) > 0)) {
            // field errors appear at the field – everything else as a message
            toast.error(`Speichern fehlgeschlagen: ${error.message}`)
          }
        },
      },
    )
  }

  async function deleteIt() {
    if (!absence) return
    const ok = await confirm({
      title: 'Abwesenheit löschen?',
      text: `${nameOf(absence.employeeId)}: ${ABSENCE_CATEGORY[absence.category]} vom ${formatDate(absence.startDate)} bis ${formatDate(absence.endDate)}. Das lässt sich nicht rückgängig machen.`,
      confirmLabel: 'Löschen',
      dangerous: true,
    })
    if (!ok) return
    remove.mutate(absence.id, {
      onSuccess: () => {
        toast.success('Abwesenheit gelöscht')
        onClose()
      },
      onError: (error) => toast.error(`Nicht gelöscht: ${error.message}`),
    })
  }

  const title = readOnly ? `${nameOf(values.employeeId)}: ${ABSENCE_CATEGORY[values.category]}` : absence ? 'Abwesenheit bearbeiten' : 'Abwesenheit erfassen'

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
              <Button variant="ghost" icon={Trash2} onClick={deleteIt} loading={remove.isPending} className={styles.left}>
                Löschen
              </Button>
            )}
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
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
                label="Von"
                type="date"
                required
                value={values.startDate}
                onChange={(e) => {
                  const startDate = e.target.value
                  // a start after the end moves the end along (one-day absences are the usual case)
                  setValues((current) => ({ ...current, startDate, endDate: current.endDate < startDate ? startDate : current.endDate }))
                  if (save.error) save.reset()
                }}
                error={fieldError('startDate')}
              />
              <Checkbox label="erst ab Mittag" checked={values.startsAfternoon} onChange={(e) => set('startsAfternoon', e.target.checked)} />
            </div>
            <div className={styles.day}>
              <TextField
                label="Bis"
                type="date"
                required
                min={values.startDate || undefined}
                value={values.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                error={fieldError('endDate')}
              />
              <Checkbox
                label="nur bis Mittag"
                checked={endsNoonCounts(values)}
                disabled={values.startDate === values.endDate && values.startsAfternoon}
                onChange={(e) => set('endsNoon', e.target.checked)}
              />
              {fieldError('endsNoon') && <p className={styles.error}>{fieldError('endsNoon')}</p>}
            </div>
          </div>

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
