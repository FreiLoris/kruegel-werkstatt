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
        phone: '044 000 00 00',
        email: null,
        webshopUrl: 'https://shop.example.ch',
        customerNumber: 'K-42',
        orderChannel: 'WEBSHOP',
        delivery: '2× täglich',
        remark: null,
        address: { name: null, street: 'Industriestrasse 1', postalCode: '6000', city: 'Luzern' },
        returnAddress: null,
        contacts: [{ department: 'Reifen', name: 'Frau Beispiel', phone: null, mobile: '079 000 00 02', email: 'reifen@example.ch', remark: null }],
        deliveries: [{ kind: 'Nachtexpress', orderDeadline: '17:00:00', tour: null, arrival: '07:30:00', arrivalNextDay: true, postage: null, remark: null }],
      },
    ],
  }),
}))
vi.mock('../stock/stockApi', () => ({
  useStockItems: () => ({
    data: [{ suppliers: [{ supplierId: 'm' }] }, { suppliers: [{ supplierId: 'x' }, { supplierId: 'm' }] }, { suppliers: [] }],
  }),
}))
vi.mock('../shopping/shoppingApi', () => ({ useShoppingItems: () => ({ data: [{ supplierId: 'm' }, { supplierId: null }] }) }))
vi.mock('../../app/person/useDevicePerson', () => ({ useCanEdit: () => false }))
vi.mock('../../lib/clock', async (original) => ({
  ...(await original<typeof import('../../lib/clock')>()),
  useClock: () => ({ today: '2026-10-28', time: '10:00' }),
}))

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
    expect(screen.getByText('1 auf der Einkaufsliste').getAttribute('href')).toBe('/shopping')
    // FB-30: the next order deadline, contacts and ways of delivery to unfold
    screen.getByText('Nächster Bestellschluss 17:00 – Nachtexpress (Ankunft ca. 07:30 am nächsten Tag)')
    screen.getByText('Reifen – Frau Beispiel')
    expect(screen.getByText('079 000 00 02').getAttribute('href')).toBe('tel:0790000002')
    screen.getByText('1 Lieferart')
    // FB-31: the address and the return label
    screen.getByText('Industriestrasse 1, 6000 Luzern')
    expect(screen.getByText('Rücksende-Etikett').getAttribute('href')).toBe('/suppliers/m/return-label')
  })
})
