import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import { CourtesyCarDialog } from './CourtesyCarDialog'

const save = vi.fn()

// the canton of new plates comes from the company profile (neutral 4)
vi.mock('../company/companyApi', () => ({ usePlateCanton: () => 'ZH' }))
vi.mock('./courtesyCarApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./courtesyCarApi')>()),
  useSaveCourtesyCar: () => ({ mutate: save, isPending: false, error: null, reset: vi.fn() }),
  useSetCourtesyCarActive: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('CourtesyCarDialog', () => {
  it('a conflict on a new car keeps the input and shows the server reason', () => {
    const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
    const onClose = vi.fn()
    render(
      <ToastContext value={toast}>
        <ConfirmContext value={() => Promise.resolve(true)}>
          <CourtesyCarDialog onClose={onClose} />
        </ConfirmContext>
      </ToastContext>,
    )
    save.mockImplementationOnce((_variables, { onError }) =>
      onError(new ApiError({ status: 409, title: 'Nicht gespeichert', detail: 'Die Änderung passt nicht zu den vorhandenen Daten.' })),
    )

    fireEvent.change(screen.getByLabelText(/Bezeichnung/), { target: { value: 'Ersatzwagen 3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen: Die Änderung passt nicht zu den vorhandenen Daten.')
  })
})
