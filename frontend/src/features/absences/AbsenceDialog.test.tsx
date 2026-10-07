import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import type { Employee } from '../employees/employeeApi'
import { AbsenceDialog } from './AbsenceDialog'

const save = vi.fn()

vi.mock('./absenceApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./absenceApi')>()),
  useSaveAbsence: () => ({ mutate: save, isPending: false, error: null, reset: vi.fn() }),
  useDeleteAbsence: () => ({ mutate: vi.fn(), isPending: false }),
}))

// fictitious
const employees = [{ id: 'r', name: 'Reto', color: '#f6d860', active: true }] as unknown as Employee[]

function renderDialog(readOnly = false) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  render(
    <ToastContext value={toast}>
      <ConfirmContext value={() => Promise.resolve(true)}>
        <AbsenceDialog fresh={{ employeeId: 'r', startDate: '2026-10-12', endDate: '2026-10-12' }} employees={employees} readOnly={readOnly} onClose={vi.fn()} />
      </ConfirmContext>
    </ToastContext>,
  )
}

describe('AbsenceDialog', () => {
  it('asks for the company only for external work and sends it', () => {
    renderDialog()
    expect(screen.queryByLabelText(/Firma/)).toBeNull()

    fireEvent.click(screen.getByLabelText('Fremdarbeit'))
    fireEvent.change(screen.getByLabelText(/Firma/), { target: { value: ' Garage Muster AG ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(save.mock.lastCall?.[0]).toMatchObject({
      id: undefined,
      request: { employeeId: 'r', category: 'EXTERNAL_WORK', company: 'Garage Muster AG', startDate: '2026-10-12', endDate: '2026-10-12' },
    })
  })

  it('one day cannot be "from noon" and "until noon" at the same time', () => {
    renderDialog()

    fireEvent.click(screen.getByLabelText('nur bis Mittag'))
    fireEvent.click(screen.getByLabelText('erst ab Mittag'))

    const untilNoon = screen.getByLabelText<HTMLInputElement>('nur bis Mittag')
    expect(untilNoon.disabled).toBe(true)
    expect(untilNoon.checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(save.mock.lastCall?.[0].request).toMatchObject({ startsAfternoon: true, endsNoon: false })
  })

  it('a start after the end moves the end along', () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText(/Von/), { target: { value: '2026-10-20' } })

    expect(screen.getByLabelText<HTMLInputElement>(/Bis/).value).toBe('2026-10-20')
  })

  it('without edit rights it only shows', () => {
    renderDialog(true)

    expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull()
    // a disabled fieldset disables everything inside (the property itself stays false)
    expect(screen.getByLabelText('Ferien').matches(':disabled')).toBe(true)
  })
})
