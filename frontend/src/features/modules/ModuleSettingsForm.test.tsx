import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModuleSettingsForm } from './ModuleSettingsForm'

const mutate = vi.fn()

vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => true }))
vi.mock('../../app/useUnsavedChanges', () => ({ useUnsavedChanges: () => {} }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('./moduleApi', () => ({
  useModuleSettings: () => ({
    data: {
      version: 2,
      modules: [
        { module: 'TIRE_HOTEL', title: 'Pneuhotel', description: 'Eingelagerte Räder', on: true },
        { module: 'STATISTICS', title: 'Statistik', description: 'Zahlen', on: false },
      ],
    },
  }),
  useSaveModuleSettings: () => ({ mutate, isPending: false }),
}))

describe('ModuleSettingsForm (neutral 3)', () => {
  it('ticked = in use; nothing to save until something changes', () => {
    render(<ModuleSettingsForm />)
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: /Pneuhotel/ }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: /Statistik/ }).checked).toBe(false)
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
  })

  it('saves the ones switched off with the version it opened with', () => {
    render(<ModuleSettingsForm />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Pneuhotel/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Statistik/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(mutate).toHaveBeenCalledWith({ off: ['TIRE_HOTEL'], version: 2 }, expect.anything())
  })
})
