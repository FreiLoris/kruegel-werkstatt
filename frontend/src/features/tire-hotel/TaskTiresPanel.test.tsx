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
})
