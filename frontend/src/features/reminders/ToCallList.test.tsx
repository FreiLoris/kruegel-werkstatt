import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ToCallList } from './ToCallList'

// fictitious
vi.mock('./reminderApi', () => ({
  useToCall: (date: string) => ({
    data:
      date === '2026-10-30'
        ? [{ taskId: 't1', taskNumber: '26-0001', customerId: 'c1', customerName: 'Beispiel Anna', mobile: null, phone: '052 000 00 00', outcome: 'NO_CONTACT', error: null }]
        : [],
  }),
}))

describe('ToCallList (17d)', () => {
  it('whom to call, with the number and why', () => {
    render(
      <MemoryRouter>
        <ToCallList date="2026-10-30" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Beispiel Anna' }).getAttribute('href')).toBe('/tasks/t1')
    expect(screen.getByRole('link', { name: /052 000 00 00/ }).getAttribute('href')).toBe('tel:0520000000')
    expect(screen.getByText(/keine Handynummer/)).toBeTruthy()
  })

  it('nothing on a day without', () => {
    const { container } = render(
      <MemoryRouter>
        <ToCallList date="2026-10-31" />
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('')
  })
})
