import { Eye, UserRound, UsersRound } from 'lucide-react'
import { Menu, MenuItem } from '../../components/ui/Menu'
import { resetChoice } from '../../lib/devicePerson'
import type { DeviceStatus } from './deviceStatus'

/**
 * In the header: who is using the device right now. The menu allows switching
 * (e.g. a tablet is handed over to another person).
 */
export function PersonMenu({ status }: { status: DeviceStatus }) {
  if (status.kind !== 'person' && status.kind !== 'viewOnly') {
    return null
  }
  return (
    <Menu label={status.kind === 'person' ? status.person.name : 'Nur ansehen'} icon={status.kind === 'person' ? UserRound : Eye}>
      <MenuItem icon={UsersRound} onClick={resetChoice}>
        Person wechseln
      </MenuItem>
    </Menu>
  )
}
