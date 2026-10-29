import { Checkbox } from '../../components/ui/Fields'
import type { Customer } from '../customers/customerSearchApi'
import { canRemind, reminderHint, reminderReach } from './reminder'
import { useReminderSettings } from './reminderApi'

interface ReminderTickProps {
  customer: Customer
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * "Kunde am Vortag erinnern" (17a) – ticked unless taken off. A customer without a mobile number and
 * e-mail, or one who wants none, cannot be reminded: the tick stays off and says what to do instead.
 */
export function ReminderTick({ customer, checked, onChange }: ReminderTickProps) {
  const { data: settings } = useReminderSettings()
  const reach = reminderReach(customer)
  const possible = canRemind(reach)
  return (
    <div>
      <Checkbox
        label="Kunde am Vortag erinnern"
        checked={possible && checked}
        disabled={!possible}
        onChange={(e) => onChange(e.target.checked)}
      />
      <p className="muted">
        {reminderHint(reach)}
        {settings && !settings.enabled && possible && ' – Erinnerungen sind in den Einstellungen noch ausgeschaltet.'}
      </p>
    </div>
  )
}
