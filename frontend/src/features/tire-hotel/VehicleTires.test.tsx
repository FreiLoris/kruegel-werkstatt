import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { TireSet } from './tireHotelApi'
import { VehicleTires } from './VehicleTires'

// fictitious tyres of one car
const summer = {
  id: 's',
  season: 'SUMMER',
  kind: 'TIRES',
  rims: null,
  brand: 'Muster',
  model: null,
  dimension: null,
  year: 2016,
  depths: { frontLeft: 2.5, frontRight: 3, rearLeft: null, rearRight: null },
  measuredOn: '2026-10-12',
  state: 'WITH_CUSTOMER',
  place: null,
  updatedAt: '2026-10-12T08:00:00Z',
} as unknown as TireSet
const winter = { ...summer, id: 'w', season: 'WINTER', year: 2023, depths: { ...summer.depths, frontLeft: 7, frontRight: 7 }, state: 'IN_HOTEL', place: 'OG-A1-1' } as TireSet
let sets: TireSet[] = []

vi.mock('./tireHotelApi', async (original) => ({
  ...(await original<typeof import('./tireHotelApi')>()),
  useVehicleTireSets: () => ({ data: sets }),
  useTreadLimits: () => ({ data: { summerMm: 3, winterMm: 4, minimumMm: 1.6 } }),
}))
vi.mock('../../lib/clock', () => ({ useToday: () => '2026-10-23' }))

const renderTires = () =>
  render(
    <MemoryRouter>
      <VehicleTires vehicleId="v1" />
    </MemoryRouter>,
  )

describe('VehicleTires (FB-12)', () => {
  it('summer and winter: where, last depth with its day, year – a light for the tread and one for the age', () => {
    sets = [winter, summer]
    renderTires()

    const [first, second] = screen.getAllByRole('listitem')
    expect(first.textContent).toContain('Beim Kunden')
    expect(first.textContent).toContain('Profil 2,5 mm (12.10.2026)')
    expect(first.textContent).toContain('ansprechen')
    expect(first.textContent).toContain('Jahrgang 2016 · 10 Jahre')
    expect(first.textContent).toContain('zu alt – ersetzen')
    expect(second.textContent).toContain('Im Pneuhotel · OG-A1-1')
    expect(second.textContent).toContain('Alter gut')
  })

  it('older sets counted, an unknown year said so', () => {
    const olderSummer = { ...summer, id: 's-old', measuredOn: '2023-04-01', updatedAt: '2023-04-01T08:00:00Z' } as TireSet
    sets = [{ ...summer, year: null } as TireSet, olderSummer]
    renderTires()

    const [only] = screen.getAllByRole('listitem')
    expect(only.textContent).toContain('1 älterer Satz')
    expect(only.textContent).toContain('Jahrgang unbekannt')
    expect(only.textContent).toContain('Alter unbekannt')
  })

  it('nothing known – nothing shown', () => {
    sets = []
    expect(renderTires().container.innerHTML).toBe('')
  })
})
