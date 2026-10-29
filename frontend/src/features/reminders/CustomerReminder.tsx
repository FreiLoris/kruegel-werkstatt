import { reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import { useSetNoReminders } from '../customers/customerApi'
import type { Customer } from '../customers/customerSearchApi'
import { reminderHint, reminderReach } from './reminder'

/**
 * On the customer page (17a): how they are reminded of appointments – and "keine Erinnerungen" for a
 * customer who does not want them. Also for SwissGarage customers: SwissGarage does not know it.
 */
export function CustomerReminder({ customer }: { customer: Customer }) {
  const canEdit = useCanEdit()
  const toast = useToast()
  const setNoReminders = useSetNoReminders()
  const reach = reminderReach(customer)

  function toggle() {
    setNoReminders.mutate(
      { id: customer.id, noReminders: !customer.noReminders },
      { onError: (error) => toast.error(`Nicht gespeichert: ${reasonOf(error)}`) },
    )
  }

  return (
    <span>
      {reach.kind === 'refused' ? 'möchte keine' : reach.kind === 'noContact' ? reminderHint(reach) : `am Vortag ${reminderHint(reach)}`}{' '}
      {canEdit && (
        <Button small variant="ghost" onClick={toggle} loading={setNoReminders.isPending}>
          {customer.noReminders ? 'Wieder erinnern' : 'Keine Erinnerungen'}
        </Button>
      )}
    </span>
  )
}
