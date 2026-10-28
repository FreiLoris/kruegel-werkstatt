import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CallLog } from './CallLog'
import { isDeletable, type CustomerCall } from './customerCallApi'

const noteCall = vi.fn()
const deleteCall = vi.fn()
vi.mock('./customerCallApi', async (original) => ({
  ...(await original<typeof import('./customerCallApi')>()),
  useNoteCall: () => ({ mutate: noteCall, isPending: false }),
  useDeleteCall: () => ({ mutate: deleteCall, isPending: false }),
}))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [{ id: 'r', name: 'Reto' }] }) }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ error: vi.fn() }) }))
vi.mock('../../app/person/useDevicePerson', () => ({ useMyEmployeeId: () => 'r' }))
vi.mock('../../lib/clock', () => ({ useClock: () => ({ today: '2026-10-28', time: '15:00' }) }))

// fictitious call
const latest = { id: 'c1', customerId: 'k1', outcome: 'NOT_REACHED', note: null, calledAt: '2026-10-28T13:55:00Z', calledBy: 'r' } as CustomerCall

describe('CallLog (FB-16, FB-21)', () => {
  // five minutes after the call
  beforeEach(() => vi.setSystemTime(new Date('2026-10-28T14:00:00Z')))
  afterEach(() => vi.useRealTimers())

  it('the latest call – and one tap notes the next one', () => {
    render(<CallLog customerId="k1" latest={latest} canEdit />)
    expect(screen.getByText(/nicht erreicht · Reto$/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Rückruf' }))
    expect(noteCall).toHaveBeenCalledWith({ customerId: 'k1', outcome: 'CALLBACK' }, expect.anything())

    fireEvent.click(screen.getByRole('button', { name: /Anruf löschen/ }))
    expect(deleteCall).toHaveBeenCalledWith('c1', expect.anything())
  })

  it('without the right to edit: only who called', () => {
    render(<CallLog customerId="k1" latest={latest} canEdit={false} />)
    expect(screen.getByText(/nicht erreicht/)).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('isDeletable', () => {
  const now = Date.parse('2026-10-28T14:00:00Z')
  it('one’s own call of the last half hour only', () => {
    expect(isDeletable({ calledAt: '2026-10-28T13:45:00Z', calledBy: 'r' }, 'r', now)).toBe(true)
    expect(isDeletable({ calledAt: '2026-10-28T13:15:00Z', calledBy: 'r' }, 'r', now)).toBe(false)
    expect(isDeletable({ calledAt: '2026-10-28T13:45:00Z', calledBy: 'e' }, 'r', now)).toBe(false)
    expect(isDeletable({ calledAt: '2026-10-28T13:45:00Z', calledBy: 'r' }, undefined, now)).toBe(false)
  })
})
