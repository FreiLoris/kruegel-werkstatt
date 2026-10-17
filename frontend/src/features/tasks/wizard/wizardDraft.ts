import type { CourtesyCarChoice } from '../../bookings/courtesyCarChoice'
import type { AppointmentForm } from './appointmentForm'
import type { CustomerStepValue } from './wizardState'

/**
 * A half-typed task survives a reload or a closed tab (UX G-01) – in this tab only
 * (`sessionStorage`), so it does not turn up on the next person's device session.
 */
export interface WizardDraft {
  step: 1 | 2 | 3
  customerStep: CustomerStepValue
  appointment: AppointmentForm
  courtesyCar: CourtesyCarChoice
}

const KEY = 'kruegel.taskWizardDraft'

export function loadDraft(): WizardDraft | null {
  try {
    const stored = sessionStorage.getItem(KEY)
    return stored ? (JSON.parse(stored) as WizardDraft) : null
  } catch {
    return null
  }
}

export function storeDraft(draft: WizardDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // full or blocked: the question before leaving still protects the input
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nothing stored then
  }
}
