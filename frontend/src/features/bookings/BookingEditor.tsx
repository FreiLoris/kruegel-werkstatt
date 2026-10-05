import { useState } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { useSaveBooking, type Booking } from './bookingApi'
import { CourtesyCarPicker } from './CourtesyCarPicker'
import styles from './BookingEditor.module.css'

interface BookingEditorProps {
  /** moving/changing this booking; empty = a new one */
  booking?: Booking
  /** new booking for a task (task detail) – otherwise a holder must be named */
  taskId?: string
  /** car and period to start with */
  initial: { courtesyCarId: string; pickupAt: string; returnAt: string }
  onSaved: (booking: Booking) => void
  onCancel: () => void
}

/**
 * Book a courtesy car or change a booking: period freely changeable (F12: the old panel was fixed
 * to "today"), the car chosen from the availability list. Task detail and courtesy car page.
 */
export function BookingEditor({ booking, taskId, initial, onSaved, onCancel }: BookingEditorProps) {
  const save = useSaveBooking()
  const toast = useToast()
  const [draft, setDraft] = useState({ ...initial, notes: booking?.notes ?? '', holder: '' })
  const [error, setError] = useState<string | null>(null)
  const needsHolder = !booking && !taskId

  function submit() {
    if (needsHolder && !draft.holder.trim()) {
      setError('Wer bekommt das Auto? Name angeben')
      return
    }
    if (!draft.courtesyCarId) {
      setError('Einen freien Ersatzwagen wählen')
      return
    }
    save.mutate(
      {
        id: booking?.id,
        request: {
          courtesyCarId: draft.courtesyCarId,
          taskId: booking ? undefined : taskId,
          holder: needsHolder ? draft.holder.trim() : undefined,
          pickupAt: draft.pickupAt,
          returnAt: draft.returnAt,
          notes: draft.notes.trim() || undefined,
          version: booking?.version,
        },
      },
      {
        onSuccess: (saved) => {
          toast.success(booking ? 'Buchung geändert' : 'Ersatzwagen gebucht')
          onSaved(saved)
        },
        onError: (e) => setError(reasonOf(e)),
      },
    )
  }

  return (
    <div className={styles.editor}>
      {needsHolder && (
        <TextField
          label="Für wen?"
          required
          value={draft.holder}
          onChange={(e) => setDraft({ ...draft, holder: e.target.value })}
          hint="Name – Ersatzwagen für einen Auftrag bucht man im Auftrag"
        />
      )}
      <CourtesyCarPicker
        name={`booking-${booking?.id ?? 'new'}`}
        pickupAt={draft.pickupAt}
        returnAt={draft.returnAt}
        onPeriodChange={(pickupAt, returnAt) => setDraft({ ...draft, pickupAt, returnAt })}
        courtesyCarId={draft.courtesyCarId}
        onCarChange={(courtesyCarId) => setDraft({ ...draft, courtesyCarId })}
        excludeBookingId={booking?.id}
      />
      <TextField label="Notiz" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button onClick={onCancel} disabled={save.isPending}>
          Abbrechen
        </Button>
        <Button variant="primary" onClick={submit} loading={save.isPending}>
          {booking ? 'Änderung speichern' : 'Buchen'}
        </Button>
      </div>
    </div>
  )
}
