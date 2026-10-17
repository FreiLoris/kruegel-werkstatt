import { Eye, UserRound, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Menu, MenuItem } from '../../components/ui/Menu'
import { Modal } from '../../components/ui/Modal'
import type { Employee } from '../../features/employees/employeeApi'
import type { DeviceStatus } from './deviceStatus'
import { PersonChoices } from './PersonPicker'

/**
 * In the header: who is using the device right now. The menu allows switching
 * (e.g. a tablet is handed over to another person) – in a dialog over the page, so a half-typed
 * task stays where it is and "Abbrechen" changes nothing (UX G-01).
 */
export function PersonMenu({ status, active }: { status: DeviceStatus; active: Employee[] }) {
  const [switching, setSwitching] = useState(false)
  if (status.kind !== 'person' && status.kind !== 'viewOnly') {
    return null
  }
  return (
    <>
      <Menu label={status.kind === 'person' ? status.person.name : 'Nur ansehen'} icon={status.kind === 'person' ? UserRound : Eye}>
        <MenuItem icon={UsersRound} onClick={() => setSwitching(true)}>
          Person wechseln
        </MenuItem>
      </Menu>
      <Modal
        open={switching}
        onClose={() => setSwitching(false)}
        title="Wer benutzt dieses Gerät?"
        wide
        footer={<Button onClick={() => setSwitching(false)}>Abbrechen</Button>}
      >
        <PersonChoices active={active} onChosen={() => setSwitching(false)} />
      </Modal>
    </>
  )
}
