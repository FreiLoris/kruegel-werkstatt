import type { Customer } from '../customers/customerSearchApi'

/** What of a customer says how they are reminded */
type Reachable = Pick<Customer, 'noReminders' | 'reminderChannel' | 'email' | 'source'>

/**
 * What a reminder of the appointment can do for a customer (17a) – the server decides the same way
 * (ReminderContact): an SMS to a mobile number, else an e-mail, else nothing; or the customer wants none.
 */
export type ReminderReach =
  | { kind: 'sms' }
  | { kind: 'email'; to: string }
  | { kind: 'refused' }
  | { kind: 'noContact'; source: Customer['source'] }

export function reminderReach(customer: Reachable): ReminderReach {
  if (customer.noReminders) return { kind: 'refused' }
  if (customer.reminderChannel === 'SMS') return { kind: 'sms' }
  if (customer.reminderChannel === 'EMAIL') return { kind: 'email', to: customer.email ?? '' }
  return { kind: 'noContact', source: customer.source }
}

/** Whether the tick can do anything – without a way to reach them it stays off */
export function canRemind(reach: ReminderReach): boolean {
  return reach.kind === 'sms' || reach.kind === 'email'
}

/** For the task's facts: "am Vortag per SMS ans Handy", "nein", or why it cannot be */
export function reminderSummary(customer: Reachable, remind: boolean): string {
  const reach = reminderReach(customer)
  if (!canRemind(reach)) return reminderHint(reach)
  return remind ? `am Vortag ${reminderHint(reach)}` : 'nein'
}

/** The line under the tick: how, or why not and what to do instead */
export function reminderHint(reach: ReminderReach): string {
  switch (reach.kind) {
    case 'sms':
      return 'per SMS ans Handy'
    case 'email':
      return `per E-Mail an ${reach.to} – keine Handynummer`
    case 'refused':
      return 'Der Kunde möchte keine Erinnerungen (auf der Kundenseite umstellbar).'
    case 'noContact':
      return `Keine Handynummer und keine E-Mail – bitte am Vortag anrufen. ${
        reach.source === 'SWISSGARAGE' ? 'Handynummer in SwissGarage ergänzen, dann gilt sie nach dem nächsten Import.' : 'Handynummer beim Kunden ergänzen.'
      }`
  }
}
