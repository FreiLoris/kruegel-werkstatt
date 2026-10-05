import { CarFront, Pencil, Plus, RotateCcw, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { formatLocalDateTime } from '../../lib/format'
import { useAllCourtesyCars } from '../courtesy-cars/courtesyCarApi'
import type { Task } from '../tasks/taskApi'
import { useTaskBookings, type Booking } from './bookingApi'
import { BookingEditor } from './BookingEditor'
import { minutesOf } from './occupancy'
import styles from './CourtesyCarPanel.module.css'
import { useBookingActions } from './useBookingActions'

/**
 * Courtesy car of a task (7c): what is booked, with return and changes – or book one. A new
 * booking suggests "kommt früher"/start to "fertig bis"/end, like the wizard.
 */
export function CourtesyCarPanel({ task, canEdit }: { task: Task; canEdit: boolean }) {
  const bookings = useTaskBookings(task.id)
  const { data: cars } = useAllCourtesyCars()
  const carName = (id: string) => cars?.find((c) => c.id === id)?.name ?? 'Ersatzwagen'
  const actions = useBookingActions(carName)
  // null = list; 'new' = book one; a booking = change it
  const [editing, setEditing] = useState<Booking | 'new' | null>(null)

  if (bookings.error) return <p className="muted">Buchungen konnten nicht geladen werden: {bookings.error.message}</p>
  if (!bookings.data) return <p className="muted">Lade …</p>

  if (editing) {
    const initial =
      editing === 'new'
        ? {
            courtesyCarId: '',
            pickupAt: minutesOf(task.arrivesEarlier ?? `${task.date}T${task.time}`),
            returnAt: minutesOf(task.readyBy ?? task.endAt),
          }
        : { courtesyCarId: editing.courtesyCarId, pickupAt: minutesOf(editing.pickupAt), returnAt: minutesOf(editing.returnAt) }
    return (
      <BookingEditor
        booking={editing === 'new' ? undefined : editing}
        taskId={task.id}
        initial={initial}
        onSaved={() => setEditing(null)}
        onCancel={() => setEditing(null)}
      />
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
                <Button small icon={Undo2} onClick={() => actions.setReturned(booking, true)} loading={actions.pending}>
                  Rückgabe rückgängig
                </Button>
              ) : (
                <>
                  {actions.canReturn(booking) && (
                    <Button small icon={RotateCcw} onClick={() => actions.setReturned(booking, false)} loading={actions.pending}>
                      Ist zurück
                    </Button>
                  )}
                  <Button small icon={Pencil} onClick={() => setEditing(booking)}>
                    Ändern
                  </Button>
                  <Button small variant="ghost" icon={X} onClick={() => void actions.cancelBooking(booking)}>
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
        <Button small icon={Plus} onClick={() => setEditing('new')}>
          Ersatzwagen buchen
        </Button>
      )}
    </div>
  )
}
