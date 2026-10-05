import { CircleCheck, Home, Plus, Printer } from 'lucide-react'
import { useNavigate } from 'react-router'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { weekdayOf, WEEKDAYS_SHORT } from '../../../lib/calendar'
import { formatDate, formatLocalDateTime, formatTime } from '../../../lib/format'
import type { Booking } from '../../bookings/bookingApi'
import { useAllCourtesyCars } from '../../courtesy-cars/courtesyCarApi'
import type { Task } from '../taskApi'
import styles from './SavedStep.module.css'

/**
 * Clear confirmation after saving (UI review: the old wizard gave no feedback) – with what
 * comes next: print the sheet, enter the next task, or back to the start.
 */
export function SavedStep({ task, booking, onNext }: { task: Task; booking: Booking | null; onNext: () => void }) {
  const navigate = useNavigate()
  const { data: cars } = useAllCourtesyCars()

  return (
    <section className={styles.saved} aria-live="polite">
      <CircleCheck className={styles.icon} aria-hidden />
      <h2>Auftrag gespeichert</h2>
      <p className={styles.summary}>
        <strong>{task.customer.displayName}</strong>
        {task.vehicle?.licensePlate && <LicensePlate text={task.vehicle.licensePlate} size="sm" />}
        {task.vehicle && <span>{task.vehicle.description}</span>}
      </p>
      <p>
        {WEEKDAYS_SHORT[weekdayOf(task.date)]} {formatDate(task.date)}, {formatTime(task.time)} Uhr
      </p>
      {booking && (
        <p>
          {cars?.find((c) => c.id === booking.courtesyCarId)?.name ?? 'Ersatzwagen'} gebucht: {formatLocalDateTime(booking.pickupAt)} –{' '}
          {formatLocalDateTime(booking.returnAt)}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="primary" icon={Printer} onClick={() => navigate(`/tasks/${task.id}/sheet`)}>
          Auftragszettel drucken
        </Button>
        <Button icon={Plus} onClick={onNext}>
          Weiteren Auftrag erfassen
        </Button>
        <Button variant="ghost" icon={Home} onClick={() => navigate('/')}>
          Zur Startseite
        </Button>
      </div>
    </section>
  )
}
