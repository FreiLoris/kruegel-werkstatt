import { describe, expect, it } from 'vitest'
import { canRemind, reminderReach, reminderSummary } from './reminder'

const huber = { noReminders: false, reminderChannel: 'SMS' as const, email: null, source: 'SWISSGARAGE' as const }

describe('reminder (17a)', () => {
  it('by SMS, else by e-mail', () => {
    expect(reminderSummary(huber, true)).toBe('am Vortag per SMS ans Handy')
    expect(reminderSummary({ ...huber, reminderChannel: 'EMAIL', email: 'a@b.ch' }, true)).toBe('am Vortag per E-Mail an a@b.ch – keine Handynummer')
    expect(reminderSummary(huber, false)).toBe('nein')
  })

  it('without mobile and e-mail someone calls – and says where to add the number', () => {
    const reach = reminderReach({ ...huber, reminderChannel: null })
    expect(canRemind(reach)).toBe(false)
    expect(reminderSummary({ ...huber, reminderChannel: null }, true)).toContain('bitte am Vortag anrufen. Handynummer in SwissGarage ergänzen')
    expect(reminderSummary({ ...huber, reminderChannel: null, source: 'LOCAL' }, true)).toContain('Handynummer beim Kunden ergänzen')
  })

  it('a customer who wants none is not reminded, ticked or not', () => {
    expect(canRemind(reminderReach({ ...huber, noReminders: true }))).toBe(false)
    expect(reminderSummary({ ...huber, noReminders: true }, true)).toContain('möchte keine Erinnerungen')
  })
})
