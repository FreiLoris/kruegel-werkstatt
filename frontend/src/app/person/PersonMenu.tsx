import { Eye, UserRound } from 'lucide-react'
import { Menu, MenuItem } from '../../components/ui/Menu'
import type { Employee } from '../../features/employees/employeeApi'
import { choose } from '../../lib/devicePerson'
import type { DeviceStatus } from './deviceStatus'

/**
 * In the header: who is using the device right now. A click lists everyone else – one more click
 * switches at once, without leaving the page (FB-29: a half-typed task stays where it is). "Nur
 * ansehen" at the end, for the workshop TV.
 */
export function PersonMenu({ status, active }: { status: DeviceStatus; active: Employee[] }) {
  if (status.kind !== 'person' && status.kind !== 'viewOnly') {
    return null
  }
  const others = active.filter((e) => status.kind !== 'person' || e.id !== status.person.id)
  return (
    <Menu label={status.kind === 'person' ? status.person.name : 'Nur ansehen'} icon={status.kind === 'person' ? UserRound : Eye}>
      {others.map((e) => (
        <MenuItem key={e.id} icon={UserRound} onClick={() => choose({ kind: 'person', id: e.id })}>
          {e.name}
        </MenuItem>
      ))}
      {status.kind === 'person' && (
        <MenuItem icon={Eye} onClick={() => choose({ kind: 'viewOnly' })}>
          Nur ansehen (z. B. Werkstatt-TV)
        </MenuItem>
      )}
    </Menu>
  )
}
