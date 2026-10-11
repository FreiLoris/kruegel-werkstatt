import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Select, TextField } from '../../../components/ui/Fields'
import { Modal } from '../../../components/ui/Modal'
import { PARTS_STATUS, type PartsStatus } from '../taskApi'
import type { AppointmentForm } from './appointmentForm'
import styles from './PartsDialog.module.css'

/** The material order as it stands in the form */
export type PartsDraft = Pick<AppointmentForm, 'partsDescription' | 'partsStatus' | 'partsSupplier' | 'partsOrderedOn'>

/**
 * The material order in its own window (feedback from the workshop, 10/2026 – it used to open
 * inline between the other work). Nothing reaches the task before "Übernehmen": closing the
 * window leaves the form as it was. Mounted fresh on every open, so it starts from `initial`.
 */
export function PartsDialog({ initial, onApply, onClose }: { initial: PartsDraft; onApply: (parts: PartsDraft) => void; onClose: () => void }) {
  const formId = useId()
  const [draft, setDraft] = useState(initial)
  // an empty "Was" is stopped by the browser (required field); this catches an entry of only blanks
  const [tried, setTried] = useState(false)
  const missing = draft.partsDescription.trim() === ''

  const set = <K extends keyof PartsDraft>(field: K, value: PartsDraft[K]) => setDraft((current) => ({ ...current, [field]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    // the wizard around it is no form, but stay safe should it ever become one
    event.stopPropagation()
    setTried(true)
    if (!missing) onApply({ ...draft, partsDescription: draft.partsDescription.trim() })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Material bestellen"
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId}>
            Übernehmen
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit}>
        <TextField
          label="Was"
          required
          placeholder="z. B. Bremsscheiben vorne"
          maxLength={500}
          autoComplete="off"
          value={draft.partsDescription}
          onChange={(e) => set('partsDescription', e.target.value)}
          error={tried && missing ? 'Was muss bestellt werden?' : undefined}
        />
        <div className={styles.row}>
          <Select label="Status" value={draft.partsStatus} onChange={(e) => set('partsStatus', e.target.value as PartsStatus)}>
            {Object.entries(PARTS_STATUS).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </Select>
          <TextField
            label="Lieferant"
            placeholder="z. B. Derendinger"
            maxLength={100}
            autoComplete="off"
            value={draft.partsSupplier}
            onChange={(e) => set('partsSupplier', e.target.value)}
          />
        </div>
        <TextField label="Bestellt am" type="date" value={draft.partsOrderedOn} onChange={(e) => set('partsOrderedOn', e.target.value)} />
      </form>
    </Modal>
  )
}
