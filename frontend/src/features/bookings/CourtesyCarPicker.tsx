import { CarFront } from 'lucide-react'
import { TextField } from '../../components/ui/Fields'
import { formatLocalDateTime } from '../../lib/format'
import { useAvailability } from './bookingApi'
import styles from './CourtesyCarPicker.module.css'

interface CourtesyCarPickerProps {
  /** "2026-10-15T08:00"; null = not known yet */
  pickupAt: string | null
  returnAt: string | null
  onPeriodChange: (pickupAt: string, returnAt: string) => void
  /** '' = none chosen */
  courtesyCarId: string
  onCarChange: (id: string) => void
  /** moving an existing booking: it does not count against itself */
  excludeBookingId?: string
  /** name for the radio group – unique per page */
  name: string
}

const split = (dateTime: string | null): [string, string] => (dateTime ? [dateTime.slice(0, 10), dateTime.slice(11, 16)] : ['', ''])

/**
 * Pickup, return and every courtesy car with "frei" or who has it when (7c, bug #2: one check for
 * all views – the server's availability). Only a free car can be chosen.
 */
export function CourtesyCarPicker({ pickupAt, returnAt, onPeriodChange, courtesyCarId, onCarChange, excludeBookingId, name }: CourtesyCarPickerProps) {
  const [pickupDate, pickupTime] = split(pickupAt)
  const [returnDate, returnTime] = split(returnAt)
  const periodValid = pickupAt !== null && returnAt !== null && returnAt > pickupAt
  const availability = useAvailability(periodValid ? pickupAt : null, periodValid ? returnAt : null, excludeBookingId)
  const chosen = availability.data?.find((car) => car.courtesyCarId === courtesyCarId)

  const change = (part: 'pickupDate' | 'pickupTime' | 'returnDate' | 'returnTime', value: string) => {
    const p = { pickupDate, pickupTime, returnDate, returnTime, [part]: value }
    onPeriodChange(`${p.pickupDate}T${p.pickupTime}`, `${p.returnDate}T${p.returnTime}`)
  }

  return (
    <div className={styles.picker}>
      <div className={styles.period}>
        <TextField label="Abholung am" type="date" value={pickupDate} onChange={(e) => change('pickupDate', e.target.value)} />
        <TextField label="um" type="time" step={900} value={pickupTime} onChange={(e) => change('pickupTime', e.target.value)} />
        <TextField label="Rückgabe am" type="date" value={returnDate} onChange={(e) => change('returnDate', e.target.value)} />
        <TextField
          label="um"
          type="time"
          step={900}
          value={returnTime}
          onChange={(e) => change('returnTime', e.target.value)}
          error={pickupAt && returnAt && !periodValid ? 'nach der Abholung' : undefined}
        />
      </div>

      {!periodValid ? (
        <p className="muted">Abholung und Rückgabe angeben – dann zeigt die Liste, welcher Wagen frei ist.</p>
      ) : availability.error ? (
        <p className="muted">Verfügbarkeit konnte nicht geladen werden: {availability.error.message}</p>
      ) : !availability.data ? (
        <p className="muted">Prüfe Verfügbarkeit …</p>
      ) : availability.data.length === 0 ? (
        <p className="muted">Keine Ersatzwagen in Betrieb – unter Einstellungen erfassen.</p>
      ) : (
        <fieldset className={styles.cars}>
          <legend className="visually-hidden">Ersatzwagen wählen</legend>
          {availability.data.map((car) => (
            <label key={car.courtesyCarId} className={[styles.car, !car.available && styles.taken].filter(Boolean).join(' ')}>
              <input
                type="radio"
                name={name}
                value={car.courtesyCarId}
                checked={courtesyCarId === car.courtesyCarId}
                disabled={!car.available}
                onChange={() => onCarChange(car.courtesyCarId)}
              />
              <CarFront aria-hidden className={styles.icon} />
              <span className={styles.name}>
                <strong>{car.name}</strong>
                <span className="muted">{[car.model, car.licensePlate].filter(Boolean).join(' · ')}</span>
              </span>
              {car.available ? (
                <span className={styles.free}>frei</span>
              ) : (
                <span className={styles.busy}>
                  {car.conflicts.map((b) => (
                    <span key={b.id}>
                      vergeben an {b.holderName}, {formatLocalDateTime(b.pickupAt)} – {formatLocalDateTime(b.blockedUntil)}
                    </span>
                  ))}
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}
      {chosen && !chosen.available && (
        <p className={styles.warning} role="alert">
          {chosen.name} ist in diesem Zeitraum vergeben – bitte einen freien Wagen wählen.
        </p>
      )}
    </div>
  )
}
