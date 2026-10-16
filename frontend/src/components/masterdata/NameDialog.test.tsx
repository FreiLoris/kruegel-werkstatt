import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { ToastContext } from '../ui/toastContext'
import { NameDialog } from './NameDialog'

const conflict = new ApiError({ status: 409, title: 'Nicht gespeichert', detail: 'Die Änderung passt nicht zu den vorhandenen Daten.' })

function renderDialog(initialName?: string) {
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  const onClose = vi.fn()
  const save = vi.fn(() => Promise.reject(conflict))
  render(
    <ToastContext value={toast}>
      <NameDialog title="Lift" initialName={initialName} placeholder="z.B. Lift 3" hint="Eindeutiger Name" maxLength={30} save={save} onClose={onClose} />
    </ToastContext>,
  )
  return { toast, onClose }
}

describe('NameDialog', () => {
  it('a conflict while creating keeps the input and shows the server reason', async () => {
    const { toast, onClose } = renderDialog()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Lift 3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen: Die Änderung passt nicht zu den vorhandenen Daten.'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole<HTMLInputElement>('textbox').value).toBe('Lift 3')
  })

  it('a conflict while renaming says that someone else changed it', async () => {
    const { toast, onClose } = renderDialog('Lift 1')

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith('Lift 1 wurde inzwischen auf einem anderen Gerät geändert. Bitte nochmals öffnen.')
  })
})
