import { CarFront, Pencil, Plus, RotateCcw, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { TextField } from '../../components/ui/Fields'
import { useToast } from '../../components/ui/toastContext'
import { formatLocalDateTime, nowTimeIso, todayIso } from '../../lib/format'
import { useAllCourtesyCars } from '../courtesy-cars/courtesyCarApi'
import type { Task } from '../tasks/taskApi'
import { useCancelBooking, useReturn, useSaveBooking, useTaskBookings, type Booking } from './bookingApi'
import { CourtesyCarPicker } from './CourtesyCarPicker'
import styles from './CourtesyCarPanel.module.css'

/** "2026-10-15T08:00:00" → "2026-10-15T08:00" – the form works with minutes */
const minutes = (dateTime: string) => dateTime.slice(0, 16)

interface Draft {
  /** empty = new booking */
  booking?: Booking
  pickupAt: string
  returnAt: string
  courtesyCarId: string
  notes: string
}

/**
 * Courtesy car of a task (7c): what is booked, with return and changes – or book one. A new
 * booking suggests "kommt früher"/start to "fertig bis"/end, like the wizard.
 */
export function CourtesyCarPanel({ task, canEdit }: { task: Task; canEdit: boolean }) {
  const bookings = useTaskBookings(task.id)
  const { data: cars } = useAllCourtesyCars()
  const save = useSaveBooking()
  const cancel = useCancelBooking()
  const giveBack = useReturn()
  const confirm = useConfirm()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const carName = (id: string) => cars?.find((c) => c.id === id)?.name ?? 'Ersatzwagen'
  // a car can only come back once it has been picked up
  const now = `${todayIso()}T${nowTimeIso()}`

  function startNew() {
    setError(null)
    setDraft({
      pickupAt: minutes(task.arrivesEarlier ?? `${task.date}T${task.time}`),
      returnAt: minutes(task.readyBy ?? task.endAt),
      courtesyCarId: '',
      notes: '',
    })
  }

  function startEdit(booking: Booking) {
    setError(null)
    setDraft({
      booking,
      pickupAt: minutes(booking.pickupAt),
      returnAt: minutes(booking.returnAt),
      courtesyCarId: booking.courtesyCarId,
      notes: booking.notes ?? '',
    })
  }

  function submit() {
    if (!draft) return
    if (!draft.courtesyCarId) {
      setError('Einen freien Ersatzwagen wählen')
      return
    }
    save.mutate(
      {
        id: draft.booking?.id,
        request: {
          courtesyCarId: draft.courtesyCarId,
          taskId: draft.booking ? undefined : task.id,
          pickupAt: draft.pickupAt,
          returnAt: draft.returnAt,
          notes: draft.notes.trim() || undefined,
          version: draft.booking?.version,
        },
      },
      {
        onSuccess: () => {
          toast.success(draft.booking ? 'Buchung geändert' : 'Ersatzwagen gebucht')
          setDraft(null)
        },
        onError: (e) => setError(reasonOf(e)),
      },
    )
  }

  async function cancelBooking(booking: Booking) {
    const ok = await confirm({
      title: 'Buchung stornieren?',
      text: `${carName(booking.courtesyCarId)} ist dann ab ${formatLocalDateTime(booking.pickupAt)} wieder frei.`,
      confirmLabel: 'Stornieren',
      dangerous: true,
    })
    if (!ok) return
    cancel.mutate(booking.id, {
      onSuccess: () => toast.success('Buchung storniert'),
      onError: (e) => toast.error(`Stornieren fehlgeschlagen: ${reasonOf(e)}`),
    })
  }

  function setReturned(booking: Booking, undo: boolean) {
    giveBack.mutate(
      { id: booking.id, undo },
      {
        onSuccess: () => toast.success(undo ? 'Rückgabe rückgängig gemacht' : `${carName(booking.courtesyCarId)} ist zurück`),
        onError: (e) => toast.error(reasonOf(e)),
      },
    )
  }

  if (bookings.error) return <p className="muted">Buchungen konnten nicht geladen werden: {bookings.error.message}</p>
  if (!bookings.data) return <p className="muted">Lade …</p>

  if (draft) {
    return (
      <div className={styles.editor}>
        <CourtesyCarPicker
          name={`courtesy-car-${task.id}`}
          pickupAt={draft.pickupAt}
          returnAt={draft.returnAt}
          onPeriodChange={(pickupAt, returnAt) => setDraft({ ...draft, pickupAt, returnAt })}
          courtesyCarId={draft.courtesyCarId}
          onCarChange={(courtesyCarId) => setDraft({ ...draft, courtesyCarId })}
          excludeBookingId={draft.booking?.id}
        />
        <TextField label="Notiz" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <Button onClick={() => setDraft(null)} disabled={save.isPending}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={submit} loading={save.isPending}>
            {draft.booking ? 'Änderung speichern' : 'Buchen'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      {bookings.data.length === 0 && <p className="muted">Kein Ersatzwagen gebucht.</p>}
      {bookings.data.map((booking) => (
        <div key={booking.id} className={styles.booking}>
          <p className={styles.car}>
            <CarFront aria-hidden /> <strong>{carName(booking.courtesyCarId)}</strong>
          </p>
          <p>
            {formatLocalDateTime(booking.pickupAt)} – {formatLocalDateTime(booking.returnAt)}
          </p>
          {booking.returnedAt && <p className={styles.returned}>Zurück seit {formatLocalDateTime(booking.returnedAt)}</p>}
          {booking.notes && <p className="muted">{booking.notes}</p>}
          {canEdit && (
            <div className={styles.actions}>
              {booking.returnedAt ? (
                <Button small icon={Undo2} onClick={() => setReturned(booking, true)} loading={giveBack.isPending}>
                  Rückgabe rückgängig
                </Button>
              ) : (
                <>
                  {minutes(booking.pickupAt) <= now && (
                    <Button small icon={RotateCcw} onClick={() => setReturned(booking, false)} loading={giveBack.isPending}>
                      Ist zurück
                    </Button>
                  )}
                  <Button small icon={Pencil} onClick={() => startEdit(booking)}>
                    Ändern
                  </Button>
                  <Button small variant="ghost" icon={X} onClick={() => void cancelBooking(booking)}>
                    Stornieren
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      {/* a second car only once the first is back – one customer, one courtesy car at a time */}
      {canEdit && bookings.data.every((b) => b.returnedAt) && (
        <Button small icon={Plus} onClick={startNew}>
          Ersatzwagen buchen
        </Button>
      )}
    </div>
  )
}
