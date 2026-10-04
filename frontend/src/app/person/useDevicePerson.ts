import { useSyncExternalStore } from 'react'
import { useActiveEmployees } from '../../features/employees/employeeApi'
import { deviceChoice, subscribe } from '../../lib/devicePerson'
import { canEdit, deviceStatus, type DeviceStatus } from './deviceStatus'

/**
 * Who uses this device – and may it edit?
 *
 * Combines the stored choice (localStorage) with the current employee list.
 * If the chosen person is deactivated on another device, the new list arrives via
 * live update – and this device immediately asks "Who are you?" again.
 */
export function useDevicePerson(): DeviceStatus {
  const choice = useSyncExternalStore(subscribe, deviceChoice)
  const { data: active, isError } = useActiveEmployees()
  return deviceStatus(choice, active, isError)
}

/**
 * May this device edit? Only show edit buttons if yes.
 *
 *   const canEdit = useCanEdit()
 *   {canEdit && <Button …>Bearbeiten</Button>}
 */
export function useCanEdit(): boolean {
  return canEdit(useDevicePerson())
}
