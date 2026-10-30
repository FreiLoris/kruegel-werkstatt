import { describe, expect, it } from 'vitest'
import { canRemind, customerReminderLabel, missedReason, reminderOutcomeText, reminderReach, reminderSummary, smsSenderProblem } from './reminder'

const huber = { noReminders: false, reminderChannel: 'SMS' as const, source: 'SWISSGARAGE' as const }

describe('reminder (17a)', () => {
  it('by SMS', () => {
    expect(reminderSummary(huber, true)).toBe('am Vortag per SMS ans Handy')
    expect(reminderSummary(huber, false)).toBe('nein')
  })

  it('without a mobile number someone calls – and says where to add the number', () => {
    const reach = reminderReach({ ...huber, reminderChannel: null })
    expect(canRemind(reach)).toBe(false)
    expect(reminderSummary({ ...huber, reminderChannel: null }, true)).toContain('bitte am Vortag anrufen. Handynummer in SwissGarage ergänzen')
    expect(reminderSummary({ ...huber, reminderChannel: null, source: 'LOCAL' }, true)).toContain('Handynummer beim Kunden ergänzen')
  })

  it('a customer who wants none is not reminded, ticked or not', () => {
    expect(canRemind(reminderReach({ ...huber, noReminders: true }))).toBe(false)
    expect(reminderSummary({ ...huber, noReminders: true }, true)).toContain('möchte keine Erinnerungen')
  })

  it('on the customer page', () => {
    expect(customerReminderLabel(reminderReach(huber))).toBe('am Vortag per SMS ans Handy')
    expect(customerReminderLabel(reminderReach({ ...huber, noReminders: true }))).toBe('möchte keine')
  })
})

describe('what happened (17d)', () => {
  it('sent – or why someone calls', () => {
    expect(reminderOutcomeText({ outcome: 'SENT', error: null, remindedAt: '2026-10-29T15:00:00Z' })).toMatch(/^SMS gesendet am 29\.10\.2026/)
    expect(reminderOutcomeText({ outcome: 'FAILED', error: 'Kein Guthaben bei ASPSMS – bitte aufladen', remindedAt: '2026-10-29T15:00:00Z' })).toBe(
      'SMS fehlgeschlagen: Kein Guthaben bei ASPSMS – bitte aufladen – bitte anrufen',
    )
    expect(missedReason('NO_CONTACT', null)).toBe('keine Handynummer')
    expect(missedReason('LOGGED', null)).toBe('SMS auf diesem Server nicht eingerichtet')
  })
})

describe('the SMS sender (neutral 1)', () => {
  it('letters and digits, up to 11, at least one letter – empty takes the company name', () => {
    expect(smsSenderProblem('Kruegel')).toBeNull()
    expect(smsSenderProblem('')).toBeNull()
    expect(smsSenderProblem('GarageMuster')).toBe('höchstens 11 Zeichen')
    expect(smsSenderProblem('Krügel')).toMatch(/ohne Umlaute/)
    expect(smsSenderProblem('Garage 24')).toMatch(/keine Leerzeichen/)
    expect(smsSenderProblem('0521234567')).toMatch(/mindestens ein Buchstabe/)
  })
})
