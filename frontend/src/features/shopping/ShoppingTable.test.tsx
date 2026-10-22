import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShoppingItem } from './shoppingApi'
import { ShoppingTable } from './ShoppingTable'

// fictitious
const item = {
  id: 'i1',
  version: 0,
  description: 'Bremsscheiben vorne',
  partNumber: '0986479S27',
  quantity: 2,
  status: 'TO_ORDER',
  recordedById: 'reto',
  orderById: null,
  task: { id: 't1', date: null, time: null, timeOpen: false, customerName: 'Muster AG', taskNumber: '26-0007', licensePlate: 'ZH 123456' },
  stockItemId: null,
  supplierId: null,
  orderedOn: null,
  expectedOn: null,
  arrivedOn: null,
} as unknown as ShoppingItem

const changeStatus = vi.fn()

vi.mock('./shoppingApi', async (original) => ({
  ...(await original<typeof import('./shoppingApi')>()),
  useChangeShoppingStatus: () => ({ mutate: changeStatus, isPending: false }),
  useDeleteShoppingItem: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../employees/employeeApi', () => ({
  useAllEmployees: () => ({ data: [{ id: 'reto', name: 'Reto', color: '#f6d860' }] }),
  useActiveEmployees: () => ({ data: [] }),
}))
vi.mock('../../components/ui/confirmContext', () => ({ useConfirm: () => vi.fn() }))
vi.mock('../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

const renderTable = (canEdit: boolean) =>
  render(
    <MemoryRouter>
      <ShoppingTable items={[item]} canEdit={canEdit} showTask label="Einkaufsliste" />
    </MemoryRouter>,
  )

beforeEach(() => changeStatus.mockReset())

describe('ShoppingTable', () => {
  it('one line per part: number and task under the description, who recorded it, nobody orders yet (FB-19, FB-20)', () => {
    renderTable(false)

    expect(screen.getByRole('link', { name: 'Bremsscheiben vorne' }).getAttribute('href')).toBe('/shopping/i1')
    expect(screen.getByText('Nr. 0986479S27')).toBeTruthy()
    expect(screen.getByRole('link', { name: /26-0007 · Muster AG · ZH 123456/ }).getAttribute('href')).toBe('/tasks/t1')
    expect(screen.getByText('Reto')).toBeTruthy()
    expect(screen.getByText('nicht zugewiesen')).toBeTruthy()
    expect(screen.getByText('zu bestellen')).toBeTruthy()
  })

  it('the state is changed right in the line', () => {
    renderTable(true)

    fireEvent.change(screen.getByRole('combobox', { name: 'Status von «Bremsscheiben vorne»' }), { target: { value: 'ORDERED' } })
    expect(changeStatus).toHaveBeenCalledWith({ id: 'i1', status: 'ORDERED' }, expect.anything())
  })
})
