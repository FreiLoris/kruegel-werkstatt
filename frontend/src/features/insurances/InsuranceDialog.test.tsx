import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import { InsuranceDialog } from './InsuranceDialog'
import type { Insurance } from './insuranceApi'

const save = vi.fn()

vi.mock('./insuranceApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./insuranceApi')>()),
  useSaveInsurance: () => ({ mutate: save, isPending: false, error: null, reset: vi.fn() }),
  useSetInsuranceActive: () => ({ mutate: vi.fn(), isPending: false }),
}))

const conflict = new ApiError({ status: 409, title: 'Nicht gespeichert', detail: 'Die Änderung passt nicht zu den vorhandenen Daten.' })

function renderDialog(insurance?: Insurance) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  const onClose = vi.fn()
  render(
    <ToastContext value={toast}>
      <ConfirmContext value={() => Promise.resolve(true)}>
        <InsuranceDialog insurance={insurance} onClose={onClose} />
      </ConfirmContext>
    </ToastContext>,
  )
  return { toast, onClose }
}

describe('InsuranceDialog', () => {
  it('a conflict on a new insurance keeps the input and shows the server reason', () => {
    const { toast, onClose } = renderDialog()
    save.mockImplementationOnce((_variables, { onError }) => onError(conflict))

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Mobiliar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen: Die Änderung passt nicht zu den vorhandenen Daten.')
  })

  it('a conflict while editing says that someone else changed it', () => {
    const { toast, onClose } = renderDialog({ id: 'i1', name: 'Mobiliar', version: 3, active: true } as Insurance)
    save.mockImplementationOnce((_variables, { onError }) => onError(conflict))

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onClose).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Mobiliar wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.')
  })
})
