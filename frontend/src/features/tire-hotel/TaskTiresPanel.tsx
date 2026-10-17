import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import { setSummary } from './taskTires'
import type { TaskTires } from './tireHotelApi'
import styles from './TireHotel.module.css'

/**
 * The tyre hotel on the task (13q): the set to mount and its place – once booked, which set went
 * out and which one in, with the prints of the stored one. Booking itself is a page of its own.
 */
export function TaskTiresPanel({ tires, fromHotel }: { tires: TaskTires; fromHotel: boolean }) {
  return (
    <div className={styles.panel}>
      {tires.mounted ? (
        <p>
          Montiert: <Link to={`/tires/${tires.mounted.id}`}>{setSummary(tires.mounted)}</Link>
          {/* stored again next season → no retrieval date any more (it crashed the old task's page) */}
          {tires.mounted.retrievedOn && <span className="muted"> – ausgelagert am {formatDate(tires.mounted.retrievedOn)}</span>}
        </p>
      ) : (
        fromHotel &&
        (tires.inHotel.length === 0 ? (
          <p className="muted">Kein Satz dieses Fahrzeugs im Pneuhotel.</p>
        ) : (
          tires.inHotel.map((s) => (
            <p key={s.id}>
              Im Pneuhotel: <Link to={`/tires/${s.id}`}>{setSummary(s)}</Link> <strong>{s.place ?? 'ohne Platz'}</strong>
            </p>
          ))
        ))
      )}
      {tires.removed ? (
        <p>
          Eingelagert: <Link to={`/tires/${tires.removed.id}`}>{setSummary(tires.removed)}</Link>{' '}
          <strong>{tires.removed.place ?? 'ohne Platz'}</strong>
          <span className={styles.prints}>
            <Link to={`/tires/${tires.removed.id}/labels`}>Etiketten drucken</Link>
            <Link to={`/tires/${tires.removed.id}/receipt`}>Einlagerungsschein</Link>
          </span>
        </p>
      ) : (
        tires.mounted && <p className="muted">Abmontierte Räder nicht eingelagert.</p>
      )}
      {!tires.mounted && !tires.removed && <p className="muted">Nach dem Radwechsel hier buchen – mit den Profiltiefen vom Auftragszettel.</p>}
    </div>
  )
}
