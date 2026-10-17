import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import { EmployeeDialog } from './EmployeeDialog'

const save = vi.fn()

vi.mock('./employeeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./employeeApi')>()),
  useSaveEmployee: () => ({ mutate: save, isPending: false, error: null, reset: vi.fn() }),
  useSetEmployeeActive: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('EmployeeDialog', () => {
  it('a conflict on a new person keeps the input and shows the server reason', () => {
    const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
    const onClose = vi.fn()
    render(
      <ToastContext value={toast}>
        <ConfirmContext value={() => Promise.resolve(true)}>
          <EmployeeDialog all={[]} onClose={onClose} />
        </ConfirmContext>
      </ToastContext>,
    )
    save.mockImplementationOnce((_variables, { onError }) =>
      onError(new ApiError({ status: 409, title: 'Nicht gespeichert', detail: 'Die Änderung passt nicht zu den vorhandenen Daten.' })),
    )

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Reto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(save).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen: Die Änderung passt nicht zu den vorhandenen Daten.')
  })
})
