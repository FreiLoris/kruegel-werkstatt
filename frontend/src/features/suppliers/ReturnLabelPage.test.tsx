import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ReturnLabelPage } from './ReturnLabelPage'

// fictitious
let supplierAddress: { name: string | null; street: string | null; postalCode: string | null; city: string | null } = {
  name: null,
  street: 'Industriestrasse 1',
  postalCode: '6000',
  city: 'Luzern',
}
vi.mock('./supplierApi', async (original) => ({
  ...(await original<typeof import('./supplierApi')>()),
  useSuppliers: () => ({ data: [{ id: 's1', name: 'Muster Teile AG', customerNumber: 'K-42', address: supplierAddress, returnAddress: null }], error: null }),
}))
vi.mock('../company/companyApi', () => ({ useCompany: () => ({ data: { name: 'Muster Garage', street: null, postalCode: null, city: null }, error: null }) }))
vi.mock('../tire-hotel/tireHotelApi', () => ({ useLabelFormats: () => ({ data: [] }) }))
vi.mock('../shopping/shoppingApi', () => ({
  useShoppingItem: (id: string | undefined) => ({ data: id ? { id, description: 'Bremssattel', partNumber: '0986' } : undefined }),
}))

const renderPage = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/suppliers/:id/return-label" element={<ReturnLabelPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('ReturnLabelPage (FB-31)', () => {
  it('the part of the position comes along – and can be typed over or cleared', () => {
    renderPage('/suppliers/s1/return-label?item=i1')

    expect(screen.getByText('Artikel: Bremssattel (Nr. 0986)')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Artikel'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Grund'), { target: { value: 'defekt' } })

    expect(screen.getByText('Artikel: (Nr. 0986)')).toBeTruthy()
    expect(screen.getByText('Grund: defekt')).toBeTruthy()
    expect(screen.getByText('Muster Garage · Kundennummer K-42')).toBeTruthy()
  })

  it('says when there is no address – printing stays possible (written by hand)', () => {
    supplierAddress = { name: null, street: null, postalCode: null, city: null }
    renderPage('/suppliers/s1/return-label')

    expect(screen.getByRole('alert').textContent).toContain('keine Adresse')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Drucken' }).disabled).toBe(false)
  })

  it('an unknown supplier: nothing to print', () => {
    renderPage('/suppliers/x/return-label')

    expect(screen.getByText('Diesen Lieferanten gibt es nicht (mehr).')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Drucken' }).disabled).toBe(true)
  })
})
