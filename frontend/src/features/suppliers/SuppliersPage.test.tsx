import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SuppliersPage } from './SuppliersPage'

// fictitious
vi.mock('./supplierApi', async (original) => ({
  ...(await original<typeof import('./supplierApi')>()),
  useSuppliers: () => ({
    data: [
      {
        id: 'm',
        name: 'Muster Teile AG',
        contactPerson: null,
        phone: '044 000 00 00',
        email: null,
        webshopUrl: 'https://shop.example.ch',
        customerNumber: 'K-42',
        orderChannel: 'WEBSHOP',
        delivery: '2× täglich',
        remark: null,
      },
    ],
  }),
}))
vi.mock('../stock/stockApi', () => ({
  useStockItems: () => ({
    data: [{ suppliers: [{ supplierId: 'm' }] }, { suppliers: [{ supplierId: 'x' }, { supplierId: 'm' }] }, { suppliers: [] }],
  }),
}))
vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => false }))

describe('SuppliersPage', () => {
  it('shows what is needed to order and links to the articles in stock', () => {
    render(
      <MemoryRouter>
        <SuppliersPage />
      </MemoryRouter>,
    )

    screen.getByText('Webshop')
    expect(screen.getByText('shop.example.ch').getAttribute('href')).toBe('https://shop.example.ch')
    expect(screen.getByText('044 000 00 00').getAttribute('href')).toBe('tel:0440000000')
    screen.getByText('2× täglich')
    // main or further supplier – both count
    expect(screen.getByText('2 Artikel im Lager').getAttribute('href')).toBe('/stock?supplier=m')
  })
})
