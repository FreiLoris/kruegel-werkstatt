import { useToast } from '../../components/ui/toastContext'
import { useClock } from '../../lib/clock'
import { addDays, formatDate } from '../../lib/format'
import { useHolidayNames } from '../publicholidays/publicHolidayApi'
import { useAllCourtesyCars } from '../courtesy-cars/courtesyCarApi'
import { useBookingsBetween } from './bookingApi'
import styles from './BookingCalendar.module.css'
import { calendarRange, daySelection } from './occupancy'
import { OccupancyCalendar } from './OccupancyCalendar'

/**
 * The occupancy of the courtesy cars while booking for a task (FB-32): from two days before the
 * pickup – a car just back may still need cleaning or fuel – to a few days after the return, the
 * period being booked shaded. Dragging open free days in a car's row takes car and days, a tap
 * takes the car.
 */
export function BookingCalendar({
  pickupAt,
  returnAt,
  onPick,
}: {
  /** "2026-11-02T08:00"; null = not known yet */
  pickupAt: string | null
  returnAt: string | null
  /** a car's row tapped (period null) or days dragged open in it */
  onPick: (courtesyCarId: string, period: { pickupAt: string; returnAt: string } | null) => void
}) {
  const toast = useToast()
  const holidays = useHolidayNames()
  const { today, time } = useClock()
  const { from, days } = calendarRange(pickupAt?.slice(0, 10) ?? today, returnAt?.slice(0, 10) ?? null)
  const { data: allCars } = useAllCourtesyCars()
  const bookings = useBookingsBetween(`${from}T00:00`, `${addDays(from, days)}T00:00`)
  const cars = (allCars ?? []).filter((car) => car.active)

  if (cars.length === 0 || !bookings.data) return null
  return (
    <section className={styles.calendar} aria-label="Belegung der Ersatzwagen">
      <p className="muted">
        Belegung ab {formatDate(from)} – der gewählte Zeitraum ist markiert. In der Zeile eines freien Wagens Tage aufziehen übernimmt
        Wagen und Zeitraum.
      </p>
      <OccupancyCalendar
        cars={cars}
        bookings={bookings.data}
        from={from}
        days={days}
        now={`${today}T${time}`}
        holidays={holidays}
        canEdit
        movable={false}
        highlight={pickupAt && returnAt && pickupAt < returnAt ? { start: pickupAt, end: returnAt } : undefined}
        onSelect={(carId, first, last) => onPick(carId, first === last ? null : daySelection(first, last))}
        onOpen={() => undefined}
        onMove={() => undefined}
        onBlocked={(message) => toast.info(message)}
      />
    </section>
  )
}
