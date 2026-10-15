import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { TireLabelsPage } from './TireLabelsPage'

// fictitious
const set = {
  id: 's1',
  customer: { displayName: 'Huber Peter' },
  vehicle: { licensePlate: 'ZH 123456' },
  season: 'WINTER',
  place: 'OG-B3-1',
  storedOn: '2026-10-15',
}
const formats = [{ id: 'f24', name: '24 pro Bogen', columns: 3, rows: 8, widthMm: 70, heightMm: 37, marginTop: 0.5, marginLeft: 0, gapX: 0, gapY: 0 }]

vi.mock('./tireHotelApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./tireHotelApi')>()),
  useTireSet: () => ({ data: set, error: null }),
  useLabelFormats: () => ({ data: formats }),
}))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/tires/s1/labels']}>
      <Routes>
        <Route path="/tires/:id/labels" element={<TireLabelsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TireLabelsPage', () => {
  it('four labels, one per wheel, with place, owner, season and the day stored', () => {
    renderPage()

    const labels = screen.getAllByRole('region', { name: /^Etikett / })
    expect(labels.map((l) => l.getAttribute('aria-label'))).toEqual(['Etikett VL', 'Etikett VR', 'Etikett HL', 'Etikett HR'])
    expect(labels[0].textContent).toContain('OG-B3-1')
    expect(labels[0].textContent).toContain('Huber Peter · ZH 123456')
    expect(labels[3].textContent).toContain('HR – Hinten rechts')
    expect(labels[3].textContent).toContain('Winter · 15.10.2026')
  })

  it('an opened sheet: from the chosen position on – the four must still fit', () => {
    renderPage()
    const start = screen.getByLabelText('Start bei Etikett (angebrochener Bogen)') as HTMLSelectElement
    expect(start.options).toHaveLength(21)

    fireEvent.change(start, { target: { value: '5' } })

    // place 5 = second row, middle: 70 mm from the left, 37.5 mm from the top
    const first = screen.getByRole('region', { name: 'Etikett VL' })
    expect(first.style.left).toBe('70mm')
    expect(first.style.top).toBe('37.5mm')
  })
})
