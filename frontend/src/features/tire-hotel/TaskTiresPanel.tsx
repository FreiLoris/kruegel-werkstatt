import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import { setSummary } from './taskTires'
import { EVENT_TEXT, type TaskTires } from './tireHotelApi'
import styles from './TireHotel.module.css'

/**
 * The tyre hotel on the task (13q): the set to mount and its place – once booked, which set went
 * out and which one in, with the prints of the stored one. Booking itself is a page of its own.
 *
 * @param newTires new tyres were mounted (FB-25) – not brought by the customer
 */
export function TaskTiresPanel({ tires, fromHotel, newTires = false }: { tires: TaskTires; fromHotel: boolean; newTires?: boolean }) {
  return (
    <div className={styles.panel}>
      {tires.mounted ? (
        <p>
          Montiert: <Link to={`/tires/${tires.mounted.id}`}>{setSummary(tires.mounted)}</Link>
          {/* stored again next season → no retrieval date any more (it crashed the old task's page) */}
          {/* what this task did (FB-12) – the set may have moved on since */}
          {tires.mountedAs === 'MOUNTED' ? (
            <span className="muted">{newTires ? ' – neue Reifen' : ' – vom Kunden mitgebracht'}</span>
          ) : (
            tires.mounted.retrievedOn && <span className="muted"> – ausgelagert am {formatDate(tires.mounted.retrievedOn)}</span>
          )}
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
      {tires.removed && (tires.removedAs === 'TAKEN_HOME' || tires.removedAs === 'DISPOSED') ? (
        <p>
          {EVENT_TEXT[tires.removedAs]}: <Link to={`/tires/${tires.removed.id}`}>{setSummary(tires.removed)}</Link>
        </p>
      ) : tires.removed ? (
        <p>
          Eingelagert: <Link to={`/tires/${tires.removed.id}`}>{setSummary(tires.removed)}</Link>{' '}
          <strong>{tires.removed.place ?? 'ohne Platz'}</strong>
          <span className={styles.prints}>
            <Link to={`/tires/${tires.removed.id}/labels`}>Etiketten drucken</Link>
            <Link to={`/tires/${tires.removed.id}/receipt`}>Einlagerungsschein</Link>
          </span>
        </p>
      ) : (
        tires.mounted && <p className="muted">Abmontierte Räder nicht erfasst.</p>
      )}
      {!tires.mounted && !tires.removed && <p className="muted">Nach dem Radwechsel hier buchen – mit den Profiltiefen vom Auftragszettel.</p>}
    </div>
  )
}
