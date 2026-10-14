import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { StockItem } from './stockApi'
import { StockPage } from './StockPage'

// fictitious
const item = (id: string, name: string, extra: Partial<StockItem> = {}) =>
  ({ id, name, category: 'SPARE_PART', articleNumber: null, manufacturer: null, quantity: null, storageLocationId: null, remark: null, suppliers: [], ...extra }) as StockItem

vi.mock('./stockApi', async (original) => ({
  ...(await original<typeof import('./stockApi')>()),
  useStockItems: () => ({
    data: [
      item('1', 'Ölfilter', { quantity: 4, storageLocationId: 'a' }),
      item('2', 'Bremsreiniger', { category: 'CONSUMABLE', storageLocationId: 'b' }),
      item('3', 'Zange', { category: 'TOOL' }),
    ],
  }),
}))
vi.mock('./storageLocationApi', () => ({
  useAllStorageLocations: () => ({
    data: [
      { id: 'a', name: 'Regal A', active: true },
      { id: 'b', name: 'Regal B', active: true },
    ],
  }),
}))
vi.mock('../suppliers/supplierApi', () => ({ useSuppliers: () => ({ data: [] }) }))
vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => true }))
vi.mock('./StockItemDialog', () => ({
  StockItemDialog: ({ defaults }: { defaults: { storageLocationId?: string } }) => <p>Dialog bei {defaults.storageLocationId ?? 'nirgends'}</p>,
}))

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <StockPage />
    </MemoryRouter>,
  )

const names = () => screen.getAllByRole('row').slice(1).map((row) => row.querySelector('td')?.textContent)

describe('StockPage', () => {
  it('shows the filter from the address – e.g. one shelf for an inventory', () => {
    renderAt('/stock?location=b')

    expect(names()).toEqual(['Bremsreiniger'])
    screen.getByText('1 von 3 Artikeln')
    // on paper: what was printed
    expect(screen.getByText(/Regal B · Stand/)).toBeTruthy()
  })

  it('sorts by the clicked column', () => {
    renderAt('/stock')
    expect(names()).toEqual(['Bremsreiniger', 'Ölfilter', 'Zange'])

    fireEvent.click(screen.getByRole('button', { name: 'Kategorie' }))

    expect(names()).toEqual(['Ölfilter', 'Bremsreiniger', 'Zange'])
  })

  it('a new article starts at the filtered shelf', () => {
    renderAt('/stock?location=a')

    fireEvent.click(screen.getByRole('button', { name: 'Artikel hinzufügen' }))

    screen.getByText('Dialog bei a')
  })
})
