import { Mail, Phone, Plus, Smartphone, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/Fields'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import { NewCustomerDialog } from '../../customers/NewCustomerDialog'
import { MIN_SEARCH_LENGTH, useCustomerSearch, type Customer, type Vehicle } from '../../customers/customerSearchApi'
import { CustomerHistory } from './CustomerHistory'
import { CustomerHitList } from './CustomerHitList'
import styles from './CustomerStep.module.css'
import { VehiclePicker } from './VehiclePicker'
import type { CustomerStepValue } from './wizardState'

/** More hits than in other searches: the list is the main content of this step (UI review). */
const HIT_LIMIT = 50

/**
 * Wizard step 1: find the customer (or create a walk-in), then choose the vehicle.
 * On the right the customer's history instead of an empty area.
 */
export function CustomerStep({ value, onChange }: { value: CustomerStepValue; onChange: (value: CustomerStepValue) => void }) {
  const [query, setQuery] = useState('')
  // a vehicle without known holder was picked → now the customer is chosen
  const [orphanVehicle, setOrphanVehicle] = useState<Vehicle | null>(null)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const canEdit = useCanEdit()
  const searchField = useRef<HTMLInputElement>(null)
  const debounced = useDebouncedValue(query, 250)
  const search = useCustomerSearch(debounced, HIT_LIMIT)

  const customer = value.customer

  // Back to the search: the old text stays (to pick another hit), but is selected – typing replaces it
  useEffect(() => {
    if (!customer) searchField.current?.select()
  }, [customer])

  function choose(chosen: Customer, vehicle?: Vehicle) {
    const pinned = vehicle ?? orphanVehicle
    onChange({ customer: chosen, vehicle: pinned ? { kind: 'vehicle', vehicle: pinned } : null })
    setOrphanVehicle(null)
  }

  if (customer) {
    return (
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card} aria-label="Gewählter Kunde">
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.customerName}>{customer.displayName}</h2>
                <p className="muted">
                  {customer.source === 'SWISSGARAGE' ? `SwissGarage Nr. ${customer.swissgarageNumber}` : 'Laufkundschaft (nur in der App)'}
                </p>
              </div>
              <Button icon={Undo2} onClick={() => onChange({ customer: null, vehicle: null })}>
                Anderen Kunden wählen
              </Button>
            </div>
            <CustomerContact customer={customer} />
          </section>

          <VehiclePicker
            customer={customer}
            value={value.vehicle}
            onChange={(vehicle) => onChange({ customer, vehicle })}
          />
        </div>
        <aside className={styles.aside}>
          <CustomerHistory customerId={customer.id} />
        </aside>
      </div>
    )
  }

  const tooShort = debounced.trim().length < MIN_SEARCH_LENGTH

  return (
    <div className={styles.search}>
      {orphanVehicle && (
        <p className={styles.note}>
          {orphanVehicle.licensePlate && <LicensePlate text={orphanVehicle.licensePlate} size="sm" />} {orphanVehicle.description}
          : Halter unbekannt – jetzt den Kunden suchen oder erfassen.{' '}
          <Button variant="ghost" small onClick={() => setOrphanVehicle(null)}>
            Fahrzeug verwerfen
          </Button>
        </p>
      )}
      <div className={styles.searchRow}>
        <div className={styles.searchField}>
          <TextField
            ref={searchField}
            label="Kunde suchen"
            hint="Name, Firma, Ort, Telefon, Kennzeichen … – mehrere Wörter grenzen ein"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setNewCustomerOpen(true)} className={styles.newButton}>
            Neuer Kunde
          </Button>
        )}
      </div>

      {tooShort ? (
        <p className="muted">Mindestens {MIN_SEARCH_LENGTH} Zeichen eingeben.</p>
      ) : search.error ? (
        <p className="muted">Suche fehlgeschlagen: {search.error.message}</p>
      ) : !search.data ? (
        <p className="muted">Suche …</p>
      ) : search.data.hits.length === 0 ? (
        <p className="muted">
          Keine Treffer für «{debounced.trim()}».{canEdit && ' Laufkundschaft? Dann «Neuer Kunde».'}
        </p>
      ) : (
        <>
          <CustomerHitList
            hits={search.data.hits}
            onCustomer={(c) => choose(c)}
            onVehicle={(c, v) => choose(c, v)}
            onVehicleWithoutHolder={setOrphanVehicle}
          />
          {search.data.more && (
            <p className="muted">Mehr als {HIT_LIMIT} Treffer – weitere Wörter eingeben, um einzugrenzen.</p>
          )}
        </>
      )}

      {newCustomerOpen && (
        <NewCustomerDialog
          initialName={/\d/.test(query) ? '' : query}
          onCreated={(created) => {
            setNewCustomerOpen(false)
            choose(created)
          }}
          onClose={() => setNewCustomerOpen(false)}
        />
      )}
    </div>
  )
}

function CustomerContact({ customer: c }: { customer: Customer }) {
  const address = [c.addition, c.street, [c.postalCode, c.city].filter(Boolean).join(' ')].filter(Boolean)
  return (
    <div className={styles.contact}>
      {address.length > 0 && <address>{address.join(', ')}</address>}
      <ul>
        {c.mobile && (
          <li>
            <Smartphone aria-hidden /> <a href={`tel:${c.mobile}`}>{c.mobile}</a>
          </li>
        )}
        {c.phone && (
          <li>
            <Phone aria-hidden /> <a href={`tel:${c.phone}`}>{c.phone}</a>
          </li>
        )}
        {c.email && (
          <li>
            <Mail aria-hidden /> <a href={`mailto:${c.email}`}>{c.email}</a>
          </li>
        )}
      </ul>
    </div>
  )
}
