import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CallLog } from './CallLog'
import type { CustomerCall } from './customerCallApi'

const noteCall = vi.fn()
const deleteCall = vi.fn()
vi.mock('./customerCallApi', async (original) => ({
  ...(await original<typeof import('./customerCallApi')>()),
  useNoteCall: () => ({ mutate: noteCall, isPending: false }),
  useDeleteCall: () => ({ mutate: deleteCall, isPending: false }),
}))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [{ id: 'r', name: 'Reto' }] }) }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ error: vi.fn() }) }))

// fictitious call
const latest = { id: 'c1', customerId: 'k1', outcome: 'NOT_REACHED', note: null, calledAt: '2026-10-28T13:05:00Z', calledBy: 'r' } as CustomerCall

describe('CallLog (FB-16, FB-21)', () => {
  it('the latest call – and one tap notes the next one', () => {
    render(<CallLog customerId="k1" latest={latest} canEdit />)
    expect(screen.getByText(/nicht erreicht · Reto/)).toBeTruthy()

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
