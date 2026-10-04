import { CircleDashed, Plus } from 'lucide-react'
import { useState } from 'react'
import { useCanEdit } from '../../../app/person/useDevicePerson'
import { LicensePlate } from '../../../components/licenseplate/LicensePlate'
import { Button } from '../../../components/ui/Button'
import { formatCount } from '../../../lib/format'
import type { Customer, Vehicle } from '../../customers/customerSearchApi'
import { MfkHint } from '../../vehicles/MfkHint'
import { NewVehicleDialog } from '../../vehicles/NewVehicleDialog'
import { useVehiclesOfCustomer } from '../../vehicles/vehicleApi'
import styles from './VehiclePicker.module.css'
import type { VehicleChoice } from './wizardState'

/**
 * Which vehicle comes? The customer's active vehicles with MFK hint, or deliberately "still open".
 * A vehicle chosen before the customer (holder unknown) is offered as well.
 */
export function VehiclePicker({
  customer,
  value,
  onChange,
}: {
  customer: Customer
  value: VehicleChoice
  onChange: (value: VehicleChoice) => void
}) {
  const vehicles = useVehiclesOfCustomer(customer.id)
  const canEdit = useCanEdit()
  const [newVehicleOpen, setNewVehicleOpen] = useState(false)

  const chosen = value?.kind === 'vehicle' ? value.vehicle : null
  const own = (vehicles.data ?? []).filter((v) => v.active)
  const options = chosen && !own.some((v) => v.id === chosen.id) ? [chosen, ...own] : own

  return (
    <section aria-labelledby="vehicle-heading">
      <div className={styles.header}>
        <h2 id="vehicle-heading">Fahrzeug</h2>
        {canEdit && (
          <Button icon={Plus} small onClick={() => setNewVehicleOpen(true)}>
            Neues Fahrzeug
          </Button>
        )}
      </div>

      {vehicles.isPending ? (
        <p className="muted">Lade Fahrzeuge …</p>
      ) : vehicles.error ? (
        <p className="muted">Fahrzeuge konnten nicht geladen werden: {vehicles.error.message}</p>
      ) : (
        <div className={styles.options} role="radiogroup" aria-labelledby="vehicle-heading">
          {options.map((v) => (
            <VehicleOption key={v.id} vehicle={v} selected={chosen?.id === v.id} onSelect={() => onChange({ kind: 'vehicle', vehicle: v })} />
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={value?.kind === 'open'}
            className={[styles.option, value?.kind === 'open' && styles.selected].filter(Boolean).join(' ')}
            onClick={() => onChange({ kind: 'open' })}
          >
            <CircleDashed aria-hidden className={styles.openIcon} />
            <span className={styles.text}>
              <span className={styles.title}>Fahrzeug noch offen</span>
              <span className={styles.sub}>z. B. neues Auto, das noch nicht in SwissGarage ist – später nachtragen</span>
            </span>
          </button>
        </div>
      )}

      {newVehicleOpen && (
        <NewVehicleDialog
          customerId={customer.id}
          fromSwissGarage={customer.source === 'SWISSGARAGE'}
          onCreated={(vehicle) => {
            setNewVehicleOpen(false)
            onChange({ kind: 'vehicle', vehicle })
          }}
          onClose={() => setNewVehicleOpen(false)}
        />
      )}
    </section>
  )
}

function VehicleOption({ vehicle: v, selected, onSelect }: { vehicle: Vehicle; selected: boolean; onSelect: () => void }) {
  const facts = [v.modelYear && `Jg. ${v.modelYear}`, v.mileageKm !== null && `${formatCount(v.mileageKm)} km`, v.color, v.fuel]
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={[styles.option, selected && styles.selected].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      <span className={styles.text}>
        <span className={styles.top}>
          {v.licensePlate ? <LicensePlate text={v.licensePlate} size="sm" /> : <span className="muted">ohne Kennzeichen</span>}
          <span className={styles.title}>{v.description}</span>
        </span>
        <span className={styles.sub}>{facts.filter(Boolean).join(' · ')}</span>
        <MfkHint vehicle={v} />
      </span>
    </button>
  )
}
