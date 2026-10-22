import { Link } from 'react-router'
import { useToday } from '../../lib/clock'
import { formatDate } from '../../lib/format'
import { setSummary } from './taskTires'
import { ageStatus, AGE_TEXT, tireAge, type AgeStatus } from './tireAge'
import { SET_STATES, useTreadLimits, useVehicleTireSets, type TireSet } from './tireHotelApi'
import { tireOverview } from './tireOverview'
import { formatDepth, lowestDepth, worstStatus } from './tread'
import { TreadChip } from './TreadDepthsView'
import styles from './VehicleTires.module.css'

/**
 * "Reifen" of a vehicle (FB-12): summer and winter – where they are, the last depth with its day,
 * the year – each with a traffic light for the tread and one for the age, side by side. When the
 * customer calls, one sees at once whether the tyres are still good. Nothing when none is known.
 */
export function VehicleTires({ vehicleId, title = 'Reifen' }: { vehicleId: string; title?: string }) {
  const { data: sets } = useVehicleTireSets(vehicleId)
  const { data: limits } = useTreadLimits()
  const today = useToday()
  if (!sets || sets.length === 0) return null

  return (
    <section className={styles.tires} aria-label={title}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {tireOverview(sets).map(({ season, set, older }) => {
          return (
            <li key={season} className={styles.set}>
              <Link to={`/tires/${set.id}`} className={styles.name}>
                {setSummary(set)}
              </Link>
              <span className={styles.where}>{whereText(set)}</span>
              <span className={styles.facts}>
                <span>
                  Profil {formatDepth(lowestDepth(set.depths))}
                  {set.measuredOn && <span className="muted"> ({formatDate(set.measuredOn)})</span>}
                </span>
                {limits && <TreadChip status={worstStatus(set.depths, set.season, limits)} />}
                <span>{set.year ? `Jahrgang ${set.year} · ${tireAge(set.year, today)} Jahre` : 'Jahrgang unbekannt'}</span>
                <AgeChip status={ageStatus(set.year, today)} />
              </span>
              {older > 0 && <span className="muted">{older === 1 ? '1 älterer Satz' : `${older} ältere Sätze`}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function whereText(set: TireSet): string {
  return set.state === 'IN_HOTEL' ? `Im Pneuhotel${set.place ? ` · ${set.place}` : ''}` : SET_STATES[set.state]
}

export function AgeChip({ status }: { status: AgeStatus }) {
  return <span className={`${styles.chip} ${styles[status]}`}>{AGE_TEXT[status]}</span>
}
