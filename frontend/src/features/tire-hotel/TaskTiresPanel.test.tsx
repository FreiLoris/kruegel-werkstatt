import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TaskTiresPanel } from './TaskTiresPanel'
import type { TaskTires, TireSet } from './tireHotelApi'

const winter = { id: 'w', season: 'WINTER', kind: 'TIRES', rims: null, brand: 'Muster', model: null, dimension: null, year: null } as unknown as TireSet

function renderPanel(mounted: TireSet) {
  render(
    <MemoryRouter>
      <TaskTiresPanel tires={{ mounted, removed: null, inHotel: [] } as unknown as TaskTires} fromHotel />
    </MemoryRouter>,
  )
}

describe('TaskTiresPanel', () => {
  it('shows when the mounted set was retrieved', () => {
    renderPanel({ ...winter, retrievedOn: '2026-10-15' })

    expect(screen.getByText(/ausgelagert am 15\.10\.2026/)).toBeTruthy()
  })

  it('an old task whose set is stored again next season still opens', () => {
    renderPanel({ ...winter, retrievedOn: null })

    expect(screen.getByText(/Montiert/)).toBeTruthy()
    expect(screen.queryByText(/ausgelagert am/)).toBeNull()
  })

  it('what the task booked, not where the sets are now (FB-12)', () => {
    // brought by the customer, retrieved from the hotel in an earlier season
    const brought = { ...winter, retrievedOn: '2025-10-15', state: 'MOUNTED' } as unknown as TireSet
    // taken home then, put on again since
    const summer = { ...winter, id: 's', season: 'SUMMER', state: 'MOUNTED' } as unknown as TireSet
    render(
      <MemoryRouter>
        <TaskTiresPanel
          tires={{ mounted: brought, mountedAs: 'MOUNTED', removed: summer, removedAs: 'TAKEN_HOME', inHotel: [] } as unknown as TaskTires}
          fromHotel={false}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/vom Kunden mitgebracht/)).toBeTruthy()
    expect(screen.queryByText(/ausgelagert am/)).toBeNull()
    expect(screen.getByText(/Abmontiert, nimmt der Kunde mit/)).toBeTruthy()
    expect(screen.queryByText(/Eingelagert/)).toBeNull()
  })
})
