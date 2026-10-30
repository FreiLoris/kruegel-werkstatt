import type { Customer } from '../customers/customerSearchApi'
import { formatTimestamp } from '../../lib/format'
import type { Reminder, ReminderOutcome } from './reminderApi'

/** What of a customer says how they are reminded */
type Reachable = Pick<Customer, 'noReminders' | 'reminderChannel' | 'source'>

/**
 * What a reminder of the appointment can do for a customer (17a) – the server decides the same way
 * (ReminderContact): an SMS to a mobile number, else nothing (no e-mail for now, decided 2026-10-29);
 * or the customer wants none.
 */
export type ReminderReach = { kind: 'sms' } | { kind: 'refused' } | { kind: 'noContact'; source: Customer['source'] }

export function reminderReach(customer: Reachable): ReminderReach {
  if (customer.noReminders) return { kind: 'refused' }
  if (customer.reminderChannel === 'SMS') return { kind: 'sms' }
  return { kind: 'noContact', source: customer.source }
}

/** Whether the tick can do anything – without a way to reach them it stays off */
export function canRemind(reach: ReminderReach): boolean {
  return reach.kind === 'sms'
}

/** For the task's facts: "am Vortag per SMS ans Handy", "nein", or why it cannot be */
export function reminderSummary(customer: Reachable, remind: boolean): string {
  const reach = reminderReach(customer)
  if (!canRemind(reach)) return reminderHint(reach)
  return remind ? `am Vortag ${reminderHint(reach)}` : 'nein'
}

/** On the customer page: how they are reminded, or why not */
export function customerReminderLabel(reach: ReminderReach): string {
  if (reach.kind === 'refused') return 'möchte keine'
  return reach.kind === 'noContact' ? reminderHint(reach) : `am Vortag ${reminderHint(reach)}`
}

/** The line under the tick: how, or why not and what to do instead */
export function reminderHint(reach: ReminderReach): string {
  switch (reach.kind) {
    case 'sms':
      return 'per SMS ans Handy'
    case 'refused':
      return 'Der Kunde möchte keine Erinnerungen (auf der Kundenseite umstellbar).'
    case 'noContact':
      return `Keine Handynummer – bitte am Vortag anrufen. ${
        reach.source === 'SWISSGARAGE' ? 'Handynummer in SwissGarage ergänzen, dann gilt sie nach dem nächsten Import.' : 'Handynummer beim Kunden ergänzen.'
      }`
  }
}

/** Why a customer is on the day's call list (17d) */
export function missedReason(outcome: Exclude<ReminderOutcome, 'SENT'>, error: string | null): string {
  switch (outcome) {
    case 'NO_CONTACT':
      return 'keine Handynummer'
    case 'FAILED':
      return `SMS fehlgeschlagen${error ? `: ${error}` : ''}`
    case 'LOGGED':
      return 'SMS auf diesem Server nicht eingerichtet'
  }
}

/** What happened with a task's reminder – "SMS gesendet am 29.10.2026 16:00" or why someone calls */
export function reminderOutcomeText(reminder: Pick<Reminder, 'outcome' | 'error' | 'remindedAt'>): string {
  return reminder.outcome === 'SENT'
    ? `SMS gesendet am ${formatTimestamp(reminder.remindedAt)}`
    : `${missedReason(reminder.outcome, reminder.error)} – bitte anrufen`
}

/**
 * Why a sender name does not fit, or null (neutral 1) – the server checks the same (SmsSenderName):
 * up to 11 letters or digits, at least one letter. Empty is fine: then from the company name.
 */
export function smsSenderProblem(sender: string): string | null {
  const name = sender.trim()
  if (name === '') return null
  if (name.length > 11) return 'höchstens 11 Zeichen'
  if (!/^[A-Za-z0-9]+$/.test(name)) return 'nur Buchstaben ohne Umlaute und Ziffern, keine Leerzeichen'
  if (!/[A-Za-z]/.test(name)) return 'mindestens ein Buchstabe – nur Ziffern gelten als Telefonnummer'
  return null
}
