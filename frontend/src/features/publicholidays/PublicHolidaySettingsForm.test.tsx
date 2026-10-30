import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PublicHolidaySettingsForm } from './PublicHolidaySettingsForm'

const mutate = vi.fn()

vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => true }))
vi.mock('../../app/useUnsavedChanges', () => ({ useUnsavedChanges: () => {} }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('./publicHolidayApi', () => ({
  usePublicHolidaySettings: () => ({
    data: {
      version: 3,
      holidays: [
        { rule: 'NEUJAHR', name: 'Neujahr', date: '2026-01-01', chosen: true },
        { rule: 'AUFFAHRT', name: 'Auffahrt', date: '2026-05-14', chosen: true },
        { rule: 'FRONLEICHNAM', name: 'Fronleichnam', date: '2026-06-04', chosen: false },
      ],
    },
  }),
  useSavePublicHolidaySettings: () => ({ mutate, isPending: false }),
}))

describe('PublicHolidaySettingsForm (neutral 2)', () => {
  it('shows every holiday with this year’s date, the chosen ones ticked', () => {
    render(<PublicHolidaySettingsForm />)
    expect((screen.getByLabelText(/Auffahrt/) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText(/Fronleichnam/) as HTMLInputElement).checked).toBe(false)
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveProperty('disabled', true)
  })

  it('saves all chosen ones with the version it opened with', () => {
    render(<PublicHolidaySettingsForm />)
    fireEvent.click(screen.getByLabelText(/Auffahrt/))
    fireEvent.click(screen.getByLabelText(/Fronleichnam/))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(mutate).toHaveBeenCalledWith({ holidays: ['NEUJAHR', 'FRONLEICHNAM'], version: 3 }, expect.anything())
  })
})
