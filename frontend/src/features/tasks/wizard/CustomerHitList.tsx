import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import type { Customer, CustomerSearchHit, Vehicle } from '../../customers/customerSearchApi'
import styles from './CustomerHitList.module.css'

interface CustomerHitListProps {
  hits: CustomerSearchHit[]
  onCustomer: (customer: Customer) => void
  /** Click on a vehicle of a customer: customer AND vehicle in one go */
  onVehicle: (customer: Customer, vehicle: Vehicle) => void
  onVehicleWithoutHolder: (vehicle: Vehicle) => void
}

/**
 * Search hits as big click areas (tablet): the customer, and each of their vehicles separately.
 * The backend puts the vehicle matching the search first.
 */
export function CustomerHitList({ hits, onCustomer, onVehicle, onVehicleWithoutHolder }: CustomerHitListProps) {
  return (
    <ul className={styles.list}>
      {hits.map((hit) => {
        const c = hit.customer
        return (
          <li key={c?.id ?? hit.vehicles[0]?.id} className={styles.hit}>
            {c ? (
              <button type="button" className={styles.customer} onClick={() => onCustomer(c)}>
                <span className={styles.name}>{c.displayName}</span>
                <span className={styles.sub}>
                  {[c.street, [c.postalCode, c.city].filter(Boolean).join(' '), c.mobile ?? c.phone].filter(Boolean).join(' · ')}
                </span>
                <span className={styles.sub}>{c.source === 'SWISSGARAGE' ? `Nr. ${c.swissgarageNumber}` : 'Laufkundschaft'}</span>
              </button>
            ) : (
              <div className={styles.customer}>
                <span className={styles.name}>Halter unbekannt</span>
              </div>
            )}
            <div className={styles.vehicles}>
              {hit.vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={styles.vehicle}
                  onClick={() => (c ? onVehicle(c, v) : onVehicleWithoutHolder(v))}
                  aria-label={`${v.licensePlate ?? 'ohne Kennzeichen'} ${v.description} wählen`}
                >
                  {v.licensePlate ? <LicensePlate text={v.licensePlate} size="sm" /> : <span className="muted">ohne Kennzeichen</span>}
                  <span>{v.description}</span>
                </button>
              ))}
              {c && hit.vehicles.length === 0 && <span className="muted">keine Fahrzeuge erfasst</span>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
