import { useId, useState, type FormEvent } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { useToday } from '../../lib/clock'
import { useMeasureTireSet, useTreadLimits, type TireSet } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { depthsOf, formFromSet, tireSetErrors, type TireSetForm } from './tireSetForm'
import { WHEELS } from './tread'
import { TreadDepthsInput } from './TreadDepthsInput'

/**
 * Measured again (FB-07) – e.g. the depths noted by hand on the task sheet. Starts empty, wheel by
 * wheel; goes into the history, so the wear over the seasons can be seen.
 */
export function MeasureDialog({ set, onClose }: { set: TireSet; onClose: () => void }) {
  const formId = useId()
  const today = useToday()
  const toast = useToast()
  const measure = useMeasureTireSet()
  const { data: limits } = useTreadLimits()
  const [form, setForm] = useState<TireSetForm>(() => ({
    ...formFromSet(set),
    sameDepth: false,
    depths: { frontLeft: '', frontRight: '', rearLeft: '', rearRight: '' },
  }))
  const [on, setOn] = useState(today)
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)

  const errors = tireSetErrors(form, today)
  const depths = depthsOf(form)
  const nothing = WHEELS.every((w) => depths[w.key] === undefined)
  const wheelErrors = WHEELS.some((w) => errors[w.key])

  function submit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    if (nothing || wheelErrors || !on) return
    measure.mutate(
      { id: set.id, depths, on, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Profiltiefen gespeichert')
          onClose()
        },
        onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Profiltiefen nachmessen"
      wide
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={measure.isPending}>
            Speichern
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.section} onSubmit={submit}>
        <TreadDepthsInput form={form} onChange={setForm} errors={errors} limits={limits} />
        {tried && nothing && <p className={styles.hint}>Mindestens eine Profiltiefe eingeben.</p>}
        <div className={styles.row}>
          <TextField label="Gemessen am" type="date" max={today} required value={on} onChange={(e) => setOn(e.target.value)} />
          <TextField
            label="Notiz"
            placeholder="z. B. vom Auftragszettel 26-0042"
            maxLength={500}
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  )
}
