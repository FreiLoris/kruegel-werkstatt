import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { ConfirmContext } from '../../components/ui/confirmContext'
import { ToastContext } from '../../components/ui/toastContext'
import { SupplierDialog } from './SupplierDialog'

const save = vi.fn()

vi.mock('./supplierApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./supplierApi')>()),
  useSaveSupplier: () => ({ mutate: save, isPending: false, error: null, reset: vi.fn() }),
  useDeleteSupplier: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('SupplierDialog', () => {
  it('a conflict on a new supplier keeps the input and shows the server reason', () => {
    const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
    const onClose = vi.fn()
    render(
      <ToastContext value={toast}>
        <ConfirmContext value={() => Promise.resolve(true)}>
          <SupplierDialog articleCount={0} onClose={onClose} />
        </ConfirmContext>
      </ToastContext>,
    )
    save.mockImplementationOnce((_variables, { onError }) =>
      onError(new ApiError({ status: 409, title: 'Nicht gespeichert', detail: 'Die Änderung passt nicht zu den vorhandenen Daten.' })),
    )

    fireEvent.change(screen.getByLabelText(/Firma/), { target: { value: 'Muster Teile AG' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen: Die Änderung passt nicht zu den vorhandenen Daten.')
  })

  it('several contacts and ways of delivery – empty rows are not sent (FB-30)', () => {
    render(
      <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
        <ConfirmContext value={() => Promise.resolve(true)}>
          <SupplierDialog articleCount={0} onClose={vi.fn()} />
        </ConfirmContext>
      </ToastContext>,
    )
    fireEvent.change(screen.getByLabelText(/Firma/), { target: { value: 'Muster Teile AG' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ansprechpartner hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ansprechpartner hinzufügen' }))
    fireEvent.change(screen.getAllByLabelText('Abteilung / Funktion')[0], { target: { value: 'Reifen' } })
    fireEvent.change(screen.getAllByLabelText('Mobile')[0], { target: { value: '079 000 00 02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lieferart hinzufügen' }))
    fireEvent.change(screen.getByLabelText(/^Art/), { target: { value: 'Tagesexpress' } })
    fireEvent.change(screen.getByLabelText('Bestellschluss'), { target: { value: '09:30' } })
    fireEvent.change(screen.getByLabelText('Porto (CHF)'), { target: { value: '12,50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(save.mock.lastCall?.[0].request).toMatchObject({
      contacts: [{ department: 'Reifen', mobile: '079 000 00 02', name: null }],
      deliveries: [{ kind: 'Tagesexpress', orderDeadline: '09:30', postage: 12.5, arrivalNextDay: false }],
    })
  })
})
