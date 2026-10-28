import { useToast } from '../../components/ui/toastContext'
import { useClock } from '../../lib/clock'
import { addDays, formatDate } from '../../lib/format'
import { useHolidayNames } from '../publicholidays/publicHolidayApi'
import { useAllCourtesyCars } from '../courtesy-cars/courtesyCarApi'
import { useBookingsBetween } from './bookingApi'
import styles from './BookingCalendar.module.css'
import { isValidPeriod } from './courtesyCarChoice'
import { calendarRange, daySelection, validDay } from './occupancy'
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
  excludeBookingId,
  onPick,
}: {
  /** "2026-11-02T08:00"; null = not known yet */
  pickupAt: string | null
  returnAt: string | null
  /** the booking being changed – not shown: the shaded period is where it goes */
  excludeBookingId?: string
  /** a car's row tapped (period null) or days dragged open in it */
  onPick: (courtesyCarId: string, period: { pickupAt: string; returnAt: string } | null) => void
}) {
  const toast = useToast()
  const holidays = useHolidayNames()
  const { today, time } = useClock()
  // half typed dates (a cleared field) count as not known
  const { from, days } = calendarRange(validDay(pickupAt) ?? today, validDay(returnAt))
  const { data: allCars } = useAllCourtesyCars()
  const bookings = useBookingsBetween(`${from}T00:00`, `${addDays(from, days)}T00:00`)
  const cars = (allCars ?? []).filter((car) => car.active)

  if (bookings.error) return <p className="muted">Belegung konnte nicht geladen werden: {bookings.error.message}</p>
  if (cars.length === 0 || !bookings.data) return null
  return (
    <section className={styles.calendar} aria-label="Belegung der Ersatzwagen">
      <p className="muted">
        Belegung ab {formatDate(from)} – der gewählte Zeitraum ist markiert. In der Zeile eines freien Wagens Tage aufziehen (am Tablet
        kurz halten) übernimmt Wagen und Zeitraum.
      </p>
      <OccupancyCalendar
        cars={cars}
        bookings={bookings.data.filter((b) => b.id !== excludeBookingId)}
        from={from}
        days={days}
        now={`${today}T${time}`}
        holidays={holidays}
        canEdit
        canMoveBars={false}
        compact
        highlight={pickupAt && returnAt && isValidPeriod(pickupAt, returnAt) ? { start: pickupAt, end: returnAt } : undefined}
        onSelect={(carId, first, last) => onPick(carId, first === last ? null : daySelection(first, last))}
        onOpen={() => undefined}
        onMove={() => undefined}
        onBlocked={(message) => toast.info(message)}
      />
    </section>
  )
}
