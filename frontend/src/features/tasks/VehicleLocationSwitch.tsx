import { Car, House } from 'lucide-react'
import { reasonOf } from '../../api/errors'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { useMoveVehicle, VEHICLE_LOCATION, type AnyTask, type VehicleLocation } from './taskApi'
import styles from './VehicleLocationSwitch.module.css'

/**
 * Where the vehicle is (FB-16): "Beim Kunden | Bei uns" – one tap, the chosen one filled. Who has
 * to be called in ("aufbieten") follows from it.
 */
export function VehicleLocationSwitch({
  value,
  onChange,
  disabled = false,
}: {
  value: VehicleLocation
  onChange: (location: VehicleLocation) => void
  disabled?: boolean
}) {
  const option = (location: VehicleLocation, icon: typeof Car) => (
    <Button
      small
      icon={icon}
      variant={value === location ? 'primary' : 'secondary'}
      aria-pressed={value === location}
      disabled={disabled}
      onClick={() => value !== location && onChange(location)}
    >
      {VEHICLE_LOCATION[location]}
    </Button>
  )
  return (
    <div className={styles.switch} role="group" aria-label="Fahrzeug">
      {option('AT_CUSTOMER', Car)}
      {option('AT_WORKSHOP', House)}
    </div>
  )
}

/** The switch of a saved task – changed right away, no version (like the status) */
export function TaskVehicleLocation({ task, canEdit }: { task: Pick<AnyTask, 'id' | 'vehicleLocation'>; canEdit: boolean }) {
  const move = useMoveVehicle()
  const toast = useToast()
  if (!canEdit) return <span>{VEHICLE_LOCATION[task.vehicleLocation]}</span>
  return (
    <VehicleLocationSwitch
      value={task.vehicleLocation}
      disabled={move.isPending}
      onChange={(location) =>
        move.mutate({ id: task.id, location }, { onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`) })
      }
    />
  )
}
