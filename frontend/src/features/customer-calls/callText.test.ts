import { describe, expect, it } from 'vitest'
import { callText } from './callText'

describe('callText (FB-16, FB-21)', () => {
  const names = (id: string) => (id === 'r' ? 'Reto' : undefined)

  it('when, how it went and who', () => {
    expect(callText({ outcome: 'NOT_REACHED', calledAt: '2026-10-28T13:05:00Z', calledBy: 'r' }, names)).toMatch(/^Angerufen 28\.10\.2026.*14:05 · nicht erreicht · Reto$/)
  })

  it('without a known person: when and how only', () => {
    expect(callText({ outcome: 'CALLBACK', calledAt: '2026-10-28T13:05:00Z', calledBy: null }, names)).toMatch(/ · Rückruf$/)
  })
})
