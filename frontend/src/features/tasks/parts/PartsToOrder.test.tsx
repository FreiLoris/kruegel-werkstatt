import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../../../components/ui/toastContext'
import type { Task } from '../taskApi'
import { PartsToOrder } from './PartsToOrder'

// fictitious
const task = {
  id: 't1',
  date: '2026-10-15',
  time: '07:30:00',
  customer: { displayName: 'Huber Peter' },
  vehicle: { licensePlate: 'ZH 900 001' },
  parts: { description: 'Bremsscheiben vorne', status: 'TO_ORDER', supplier: 'Derendinger', orderedOn: null },
} as unknown as Task

let tasks: Task[]
const change = vi.fn()

vi.mock('../taskApi', () => ({
  usePartsToOrder: () => ({ data: tasks }),
  useChangePartsStatus: () => ({ mutate: change, isPending: false }),
}))

function renderList(canEdit = true) {
  return render(
    <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
      <MemoryRouter>
        <PartsToOrder canEdit={canEdit} />
      </MemoryRouter>
    </ToastContext>,
  )
}

beforeEach(() => {
  tasks = [task]
  change.mockClear()
})

describe('PartsToOrder', () => {
  it('shows what to order and for which task; "Bestellt" sets the status of the parts order', () => {
    renderList()

    expect(screen.getByText('Bremsscheiben vorne')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Huber Peter, 15\.10\. 07:30 · ZH 900 001/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Bestellt' }))

    expect(change.mock.lastCall?.[0]).toEqual({ id: 't1', status: 'ORDERED' })
  })

  it('shows no button without edit rights and nothing at all when nothing is to order', () => {
    const first = renderList(false)
    expect(screen.queryByRole('button', { name: 'Bestellt' })).toBeNull()
    first.unmount()

    tasks = []
    expect(renderList().container.innerHTML).toBe('')
  })
})
