import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { Facts } from '../../components/ui/Facts'
import { LoadFailed } from '../../components/ui/LoadFailed'
import { formatDate } from '../../lib/format'
import { CustomerHistory } from '../tasks/wizard/CustomerHistory'
import { SEASONS, useTireSets } from '../tire-hotel/tireHotelApi'
import { useVehiclesOfCustomer } from '../vehicles/vehicleApi'
import { useCustomer } from './customerApi'
import { CustomerDialog } from './CustomerDialog'
import styles from './CustomerPage.module.css'
import type { Customer } from './customerSearchApi'

/**
 * A customer at a glance (UX G-05): how to reach them, their vehicles, the last tasks and what lies in
 * the tyre hotel – "Telefonnummer von Herrn Bösch?" without starting a new task. From here straight
 * to a new task for them.
 */
export function CustomerPage() {
  const { id } = useParams()
  const customer = useCustomer(id)
  if (!customer.data) {
    if (!customer.error) return <p className="muted">Lade Kunde …</p>
    return (
      <LoadFailed
        what="Kunde"
        error={customer.error}
        notFound="Diesen Kunden gibt es nicht (mehr) – vielleicht wurde er zusammengeführt oder der Link ist unvollständig."
        back={{ to: '/', label: 'Zur Startseite' }}
        onRetry={() => void customer.refetch()}
      />
    )
  }
  return <CustomerView customer={customer.data} />
}

function CustomerView({ customer }: { customer: Customer }) {
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const vehicles = useVehiclesOfCustomer(customer.id)
  const { data: inHotel } = useTireSets(true)
  const [editing, setEditing] = useState(false)
  const sets = (inHotel ?? []).filter((set) => set.customer.id === customer.id)
  const address = [customer.street, [customer.postalCode, customer.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const tel = (number: string | null) => number && <a href={`tel:${number.replace(/\s/g, '')}`}>{number}</a>

  return (
    <>
      <p>
        <Button variant="ghost" small icon={ArrowLeft} onClick={() => navigate(-1)}>
          Zurück
        </Button>
      </p>
      <div className={styles.title}>
        <h1>{customer.displayName}</h1>
        <div className={styles.actions}>
          {canEdit && customer.editable && (
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
          )}
          {canEdit && (
            <Button variant="primary" icon={Plus} onClick={() => navigate(`/tasks/new?customer=${customer.id}`)}>
              Neuer Auftrag für {customer.displayName}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.columns}>
        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading">Kontakt</h2>
          <Facts
            rows={[
              ['Firma', customer.company],
              ['Zusatz', customer.addition],
              ['Adresse', address],
              ['Handy', tel(customer.mobile)],
              ['Telefon', tel(customer.phone)],
              ['E-Mail', customer.email && <a key="email" href={`mailto:${customer.email}`}>{customer.email}</a>],
              ['Herkunft', customer.source === 'SWISSGARAGE' ? `SwissGarage${customer.swissgarageNumber ? ` (Nr. ${customer.swissgarageNumber})` : ''}` : 'Laufkunde (in der App erfasst)'],
            ]}
          />
          {!customer.editable && <p className="muted">Änderungen an Stammkunden werden in SwissGarage gemacht.</p>}

          <h2>Fahrzeuge</h2>
          {vehicles.data === undefined ? (
            <p className="muted">{vehicles.error ? `Konnte nicht geladen werden: ${vehicles.error.message}` : 'Lade …'}</p>
          ) : vehicles.data.length === 0 ? (
            <p className="muted">Keine Fahrzeuge erfasst.</p>
          ) : (
            <ul className={styles.list}>
              {vehicles.data.map((vehicle) => (
                <li key={vehicle.id} className={vehicle.active ? undefined : styles.inactive}>
                  {vehicle.licensePlate ? <LicensePlate text={vehicle.licensePlate} size="sm" /> : <span className="muted">ohne Kennzeichen</span>}{' '}
                  {vehicle.description}
                  {!vehicle.active && <span className="muted"> (nicht mehr verwendet)</span>}
                </li>
              ))}
            </ul>
          )}

          <h2>Im Pneuhotel</h2>
          {sets.length === 0 ? (
            <p className="muted">{inHotel ? 'Keine Sätze eingelagert.' : 'Lade …'}</p>
          ) : (
            <ul className={styles.list}>
              {sets.map((set) => (
                <li key={set.id}>
                  <Link to={`/tires/${set.id}`}>
                    {SEASONS[set.season]}satz{set.vehicle?.licensePlate ? ` ${set.vehicle.licensePlate}` : ''}
                  </Link>
                  <span className="muted">
                    {' '}
                    · {set.place ?? 'ohne Platz'} · seit {formatDate(set.storedOn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <CustomerHistory customerId={customer.id} linked />
      </div>

      {editing && <CustomerDialog customer={customer} onSaved={() => setEditing(false)} onClose={() => setEditing(false)} />}
    </>
  )
}
