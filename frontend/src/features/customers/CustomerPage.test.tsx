import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { CustomerPage } from './CustomerPage'

// fictitious
const customer = {
  id: 'c1',
  displayName: 'Beispiel Anna',
  company: null,
  addition: null,
  street: 'Musterweg 1',
  postalCode: '8000',
  city: 'Zürich',
  mobile: '079 000 00 00',
  phone: null,
  email: null,
  source: 'LOCAL',
  swissgarageNumber: null,
  editable: true,
}

vi.mock('./customerApi', () => ({ useCustomer: () => ({ data: customer, error: null }) }))
vi.mock('../vehicles/vehicleApi', () => ({
  useVehiclesOfCustomer: () => ({ data: [{ id: 'v1', licensePlate: 'ZH 123', description: 'VW Golf', active: true }] }),
}))
vi.mock('../tire-hotel/tireHotelApi', () => ({
  SEASONS: { WINTER: 'Winter', SUMMER: 'Sommer', ALL_SEASON: 'Ganzjahr' },
  useTireSets: () => ({
    data: [{ id: 's1', customer: { id: 'c1' }, vehicle: { licensePlate: 'ZH 123' }, season: 'WINTER', place: 'A1', storedOn: '2026-04-01' }],
  }),
}))
vi.mock('../tire-hotel/VehicleTires', () => ({ VehicleTires: () => null }))
vi.mock('../tasks/wizard/CustomerHistory', () => ({ CustomerHistory: () => <p>Bisherige Aufträge</p> }))
vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => true }))

describe('CustomerPage', () => {
  it('shows how to reach the customer, the vehicles, the hotel – and a new task for them (UX G-05)', () => {
    render(
      <MemoryRouter initialEntries={['/customers/c1']}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Beispiel Anna')
    expect(screen.getByRole('link', { name: '079 000 00 00' }).getAttribute('href')).toBe('tel:0790000000')
    expect(screen.getByText('VW Golf')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Wintersatz/ }).getAttribute('href')).toBe('/tires/s1')
    expect(screen.getByRole('button', { name: 'Neuer Auftrag für Beispiel Anna' })).toBeTruthy()
  })
})
