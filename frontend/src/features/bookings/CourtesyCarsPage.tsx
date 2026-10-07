import { CarFront, ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, RotateCcw, Settings, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { Facts } from '../../components/ui/Facts'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { useToast } from '../../components/ui/toastContext'
import { useClock } from '../../lib/clock'
import { addDays, formatLocalDateTime } from '../../lib/format'
import { useAllCourtesyCars, type CourtesyCar } from '../courtesy-cars/courtesyCarApi'
import { DueDate } from '../courtesy-cars/DueDate'
import { useHolidayNames } from '../publicholidays/publicHolidayApi'
import { useBookingsBetween, useSaveBooking, type Booking } from './bookingApi'
import { BookingEditor } from './BookingEditor'
import styles from './CourtesyCarsPage.module.css'
import { OccupancyCalendar } from './OccupancyCalendar'
import { carState, daySelection, defaultPeriod, minutesOf, movedByDays, type CarState } from './occupancy'
import { useBookingActions } from './useBookingActions'

/** Days shown in the occupancy calendar – two weeks, moved by one week */
const DAYS = 14
/** Card status: bookings this far back (a long overdue car) and ahead (the next reservation) */
const STATE_DAYS_BACK = 60
const STATE_DAYS_AHEAD = 31

type Panel =
  | { kind: 'new'; initial: { courtesyCarId: string; pickupAt: string; returnAt: string } }
  | { kind: 'show'; bookingId: string }
  | { kind: 'edit'; bookingId: string }

/**
 * The courtesy cars (7d): cards with where each car is right now, the occupancy calendar and a
 * panel to book or change – the period always changeable (F12). Live: other devices' bookings
 * appear right away.
 */
export function CourtesyCarsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const canEdit = useCanEdit()
  const holidays = useHolidayNames()
  // keeps itself up to date: the "now" line moves, an overdue car turns red without reloading
  const { today, time } = useClock()
  const now = `${today}T${time}`
  const [from, setFrom] = useState(today)
  const [panel, setPanel] = useState<Panel | null>(null)
  // a moved bar stays at its new place until the bookings themselves show it (no flash back)
  const [pending, setPending] = useState<{ bookings: Booking[]; basedOn: Booking[] } | null>(null)

  const { data: allCars } = useAllCourtesyCars()
  const calendar = useBookingsBetween(`${from}T00:00`, `${addDays(from, DAYS)}T00:00`)
  const around = useBookingsBetween(`${addDays(today, -STATE_DAYS_BACK)}T00:00`, `${addDays(today, STATE_DAYS_AHEAD)}T00:00`)
  const save = useSaveBooking()
  const panelRef = useRef<HTMLElement>(null)
  // the panel opens below the calendar – bring it into view (on a tablet it would be off screen)
  const panelKey = panel ? `${panel.kind}-${panel.kind === 'new' ? JSON.stringify(panel.initial) : panel.bookingId}` : null
  useEffect(() => {
    if (panelKey) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [panelKey])

  const cars = (allCars ?? []).filter((car) => car.active)
  const carName = (id: string) => allCars?.find((c) => c.id === id)?.name ?? 'Ersatzwagen'
  const actions = useBookingActions(carName)
  const calendarBookings = calendar.data && pending?.basedOn === calendar.data ? pending.bookings : (calendar.data ?? [])
  const states = new Map(cars.map((car) => [car.id, carState((around.data ?? []).filter((b) => b.courtesyCarId === car.id), now)]))
  const shownBooking =
    panel && panel.kind !== 'new'
      ? [...(calendar.data ?? []), ...(around.data ?? [])].find((b) => b.id === panel.bookingId)
      : undefined

  function move(booking: Booking, courtesyCarId: string, days: number) {
    const period = movedByDays(booking, days)
    const arranged = calendarBookings.map((b) =>
      b.id === booking.id ? { ...b, courtesyCarId, pickupAt: `${period.pickupAt}:00`, returnAt: `${period.returnAt}:00` } : b,
    )
    setPending({ bookings: arranged, basedOn: calendar.data ?? [] })
    save.mutate(
      { id: booking.id, request: { courtesyCarId, ...period, notes: booking.notes ?? undefined, version: booking.version } },
      {
        onSuccess: () => toast.success(`${booking.holderName}: ${carName(courtesyCarId)} ab ${formatLocalDateTime(period.pickupAt)}`),
        onError: (e) => {
          setPending(null)
          toast.error(`Nicht verschoben: ${reasonOf(e)}`)
        },
      },
    )
  }

  const out = cars.filter((car) => states.get(car.id)?.kind !== 'free').length

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1>Ersatzwagen</h1>
          <p className="muted">
            {cars.length === 1 ? '1 Fahrzeug' : `${cars.length} Fahrzeuge`} · {out} unterwegs · {cars.length - out} frei
          </p>
        </div>
        <Button icon={Settings} onClick={() => navigate('/settings')}>
          Fahrzeuge verwalten
        </Button>
      </div>

      {allCars && cars.length === 0 && <p className="muted">Noch keine Ersatzwagen in Betrieb – unter Einstellungen erfassen.</p>}

      <div className={styles.cards}>
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            state={states.get(car.id) ?? { kind: 'free', next: null }}
            canEdit={canEdit}
            onBook={() => setPanel({ kind: 'new', initial: { courtesyCarId: car.id, ...defaultPeriod(now) } })}
            onOpen={(booking) => setPanel({ kind: 'show', bookingId: booking.id })}
          />
        ))}
      </div>

      <section className={styles.calendar} aria-labelledby="occupancy-heading">
        <div className={styles.calendarHeader}>
          <h2 id="occupancy-heading">Belegung</h2>
          <div className={styles.nav}>
            <Button small variant="ghost" icon={ChevronLeft} onClick={() => setFrom(addDays(from, -7))} aria-label="Eine Woche zurück" />
            <Button small variant="ghost" onClick={() => setFrom(today)} disabled={from === today}>
              Heute
            </Button>
            <Button small variant="ghost" icon={ChevronRight} onClick={() => setFrom(addDays(from, 7))} aria-label="Eine Woche weiter" />
          </div>
        </div>
        {calendar.error ? (
          <p className="muted">Buchungen konnten nicht geladen werden: {calendar.error.message}</p>
        ) : (
          <OccupancyCalendar
            cars={cars}
            bookings={calendarBookings}
            from={from}
            days={DAYS}
            now={now}
            holidays={holidays}
            canEdit={canEdit}
            onSelect={(courtesyCarId, first, last) => setPanel({ kind: 'new', initial: { courtesyCarId, ...daySelection(first, last) } })}
            onOpen={(booking) => setPanel({ kind: 'show', bookingId: booking.id })}
            onMove={move}
            onBlocked={(message) => toast.error(message)}
            selectedId={panel && panel.kind !== 'new' ? panel.bookingId : undefined}
          />
        )}
        <p className={styles.legend}>
          {canEdit && 'Freie Tage aufziehen = neue Buchung (am Tablet kurz halten). Geplante Buchung ziehen = anderer Tag oder Wagen. '}
          Klick auf eine Buchung zeigt sie unten.
        </p>
      </section>

      {panel && (
        <section ref={panelRef} className={styles.panel} aria-labelledby="booking-panel-heading">
          {panel.kind === 'new' && (
            <>
              <h2 id="booking-panel-heading">Ersatzwagen buchen</h2>
              <BookingEditor
                key={JSON.stringify(panel.initial)}
                initial={panel.initial}
                onSaved={(booking) => setPanel({ kind: 'show', bookingId: booking.id })}
                onCancel={() => setPanel(null)}
              />
            </>
          )}
          {panel.kind === 'edit' && shownBooking && (
            <>
              <h2 id="booking-panel-heading">Buchung ändern – {shownBooking.holderName}</h2>
              <BookingEditor
                booking={shownBooking}
                initial={{
                  courtesyCarId: shownBooking.courtesyCarId,
                  pickupAt: minutesOf(shownBooking.pickupAt),
                  returnAt: minutesOf(shownBooking.returnAt),
                }}
                onSaved={() => setPanel({ kind: 'show', bookingId: shownBooking.id })}
                onCancel={() => setPanel({ kind: 'show', bookingId: shownBooking.id })}
              />
            </>
          )}
          {panel.kind === 'show' && shownBooking && (
            <>
              <div className={styles.panelHeader}>
                <h2 id="booking-panel-heading">
                  {carName(shownBooking.courtesyCarId)} – {shownBooking.holderName}
                </h2>
                <Button small variant="ghost" icon={X} onClick={() => setPanel(null)} aria-label="Schliessen" />
              </div>
              <Facts
                rows={[
                  ['Abholung', formatLocalDateTime(shownBooking.pickupAt)],
                  ['Rückgabe geplant', formatLocalDateTime(shownBooking.returnAt)],
                  ['Zurück', shownBooking.returnedAt ? formatLocalDateTime(shownBooking.returnedAt) : 'noch nicht'],
                  ['Notiz', shownBooking.notes],
                ]}
              />
              <div className={styles.actions}>
                {shownBooking.taskId && (
                  <Button small icon={ClipboardList} onClick={() => navigate(`/tasks/${shownBooking.taskId}`)}>
                    Zum Auftrag
                  </Button>
                )}
                {canEdit &&
                  (shownBooking.returnedAt ? (
                    <Button small icon={Undo2} onClick={() => actions.setReturned(shownBooking, true)} loading={actions.pending}>
                      Rückgabe rückgängig
                    </Button>
                  ) : (
                    <>
                      {actions.canReturn(shownBooking) && (
                        <Button small icon={RotateCcw} onClick={() => actions.setReturned(shownBooking, false)} loading={actions.pending}>
                          Ist zurück
                        </Button>
                      )}
                      <Button small icon={Pencil} onClick={() => setPanel({ kind: 'edit', bookingId: shownBooking.id })}>
                        Ändern
                      </Button>
                      <Button small variant="ghost" icon={X} onClick={() => void actions.cancelBooking(shownBooking, () => setPanel(null))}>
                        Stornieren
                      </Button>
                    </>
                  ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  )
}

/** One car: where it is right now (in words and color), service and insurance, book it */
function CarCard({
  car,
  state,
  canEdit,
  onBook,
  onOpen,
}: {
  car: CourtesyCar
  state: CarState
  canEdit: boolean
  onBook: () => void
  onOpen: (booking: Booking) => void
}) {
  const label = state.kind === 'overdue' ? 'Überfällig' : state.kind === 'out' ? 'Unterwegs' : 'Frei'
  const booking = state.kind === 'free' ? state.next : state.booking
  const text =
    state.kind === 'overdue'
      ? `${state.booking.holderName} – sollte seit ${formatLocalDateTime(state.booking.returnAt)} zurück sein`
      : state.kind === 'out'
        ? `${state.booking.holderName} – zurück ${formatLocalDateTime(state.booking.returnAt)}`
        : state.next
          ? `Reserviert ab ${formatLocalDateTime(state.next.pickupAt)} – ${state.next.holderName}`
          : 'Keine Reservation'
  return (
    <article className={[styles.card, styles[state.kind]].join(' ')}>
      <div className={styles.cardHeader}>
        <h2 className={styles.carName}>
          <CarFront aria-hidden /> {car.name}
        </h2>
        <span className={styles.badge}>{label}</span>
      </div>
      <p className={styles.carMeta}>
        {car.licensePlate && <LicensePlate text={car.licensePlate} size="sm" />}
        {car.model && <span>{car.model}</span>}
      </p>
      {booking ? (
        <button type="button" className={styles.state} onClick={() => onOpen(booking)} title="Buchung anzeigen">
          {text}
        </button>
      ) : (
        <p className={styles.state}>{text}</p>
      )}
      <dl className={styles.dates}>
        <div>
          <dt>Service fällig</dt>
          <dd>
            <DueDate date={car.serviceDue} status={car.serviceStatus} kind="service" />
          </dd>
        </div>
        <div>
          <dt>Versicherung bis</dt>
          <dd>
            <DueDate date={car.insuranceUntil} status={car.insuranceStatus} kind="insurance" />
          </dd>
        </div>
      </dl>
      {canEdit && (
        <div className={styles.cardActions}>
          <Button small icon={Plus} onClick={onBook}>
            Buchen
          </Button>
        </div>
      )}
    </article>
  )
}
