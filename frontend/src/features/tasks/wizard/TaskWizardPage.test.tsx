import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../../../components/ui/toastContext'
import type { Customer, Vehicle } from '../../customers/customerSearchApi'
import { TaskWizardPage } from './TaskWizardPage'
import type { CustomerStepValue } from './wizardState'

// fictitious
const customer = { id: 'c1', displayName: 'Beispiel Anna' } as Customer
const vehicle = { id: 'v1', description: 'VW Golf', licensePlate: null } as Vehicle

// Step 1 as three buttons that report what the real step reports on a click
vi.mock('./CustomerStep', () => ({
  CustomerStep: ({ onChange }: { onChange: (value: CustomerStepValue) => void }) => (
    <>
      <button onClick={() => onChange({ customer, vehicle: null })}>nur Kunde</button>
      <button onClick={() => onChange({ customer, vehicle: { kind: 'vehicle', vehicle } })}>Fahrzeug</button>
      <button onClick={() => onChange({ customer, vehicle: { kind: 'open' } })}>noch offen</button>
    </>
  ),
}))
vi.mock('./AppointmentStep', () => ({ AppointmentStep: () => <p>Schritt 2</p> }))
vi.mock('../../bookings/CourtesyCarSection', () => ({ CourtesyCarSection: () => null }))
vi.mock('../../bookings/bookingApi', () => ({ useCreateTaskWithBooking: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }) }))
vi.mock('../../publicholidays/publicHolidayApi', () => ({ useHolidayNames: () => new Map() }))
vi.mock('../taskApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../taskApi')>()),
  useCreateTask: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }),
}))

function renderWizard() {
  render(
    <MemoryRouter>
      <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
        <TaskWizardPage />
      </ToastContext>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // jsdom has no scrolling
  window.scrollTo = vi.fn()
})

describe('TaskWizardPage – on to step 2 by itself', () => {
  it('choosing the vehicle goes straight to the appointment', () => {
    renderWizard()

    fireEvent.click(screen.getByRole('button', { name: 'Fahrzeug' }))

    expect(screen.getByText('Schritt 2')).toBeTruthy()
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
  })

  it('"noch offen" is a decision too', () => {
    renderWizard()

    fireEvent.click(screen.getByRole('button', { name: 'noch offen' }))

    expect(screen.getByText('Schritt 2')).toBeTruthy()
  })

  it('the customer alone does not go on – the vehicle is still to be chosen', () => {
    renderWizard()

    fireEvent.click(screen.getByRole('button', { name: 'nur Kunde' }))

    expect(screen.queryByText('Schritt 2')).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Weiter' }).disabled).toBe(true)
  })

  it('coming back to step 1 stays there until something is clicked', () => {
    renderWizard()
    fireEvent.click(screen.getByRole('button', { name: 'Fahrzeug' }))

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(screen.queryByText('Schritt 2')).toBeNull()
    // the choice is still there, so "Weiter" works
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByText('Schritt 2')).toBeTruthy()
  })
})
