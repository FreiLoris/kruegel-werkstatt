import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PlaceMap } from './PlaceMap'
import type { TireLocation, TirePlace, TireSet } from './tireHotelApi'

// fictitious: a grid of 1 column × 1 row with 2 sets per field, and shelves
const locations = [
  { id: 'og', code: 'OG', name: 'Werkstatt', kind: 'FLOOR', sizeA: 1, sizeB: 1, sizeC: 2 },
  { id: 'ct', code: 'CT', name: 'Container', kind: 'SHELVES', sizeA: 1, sizeB: 2, sizeC: 1 },
] as TireLocation[]
const places = [
  { id: 'p1', locationId: 'og', a: 1, b: 1, c: 1, address: 'OG-A1-1', active: true },
  { id: 'p2', locationId: 'og', a: 1, b: 1, c: 2, address: 'OG-A1-2', active: true },
  { id: 'p3', locationId: 'ct', a: 1, b: 1, c: 1, address: 'CT-R1-E1-F1', active: true },
  { id: 'p4', locationId: 'ct', a: 1, b: 2, c: 1, address: 'CT-R1-E2-F1', active: true },
] as TirePlace[]
const sets = [
  {
    id: 's1',
    placeId: 'p1',
    retrievedOn: null,
    customer: { displayName: 'Huber Peter' },
    vehicle: null,
    season: 'WINTER',
    depths: { frontLeft: 3, frontRight: 5, rearLeft: 5, rearRight: 5 },
  },
] as TireSet[]
const limits = { version: 0, summerMm: 3, winterMm: 4, minimumMm: 1.6 }

describe('PlaceMap', () => {
  it('pick: a free place is chosen, a taken one names its customer and cannot be chosen', () => {
    const onPick = vi.fn()
    render(<PlaceMap locations={locations} places={places} sets={sets} limits={limits} mode="pick" onPick={onPick} />)

    expect(screen.getByTitle('OG-A1-1 · Huber Peter').textContent).toContain('Huber P.')
    fireEvent.click(screen.getByTitle('OG-A1-2 · frei'))
    expect(onPick).toHaveBeenCalledWith(places[1])
    // one free place each
    expect(screen.getByRole('button', { name: /OG – Werkstatt/ }).textContent).toContain('1 frei')
  })

  it('view: a taken place opens its set; the shelves show the top level on top', () => {
    render(
      <MemoryRouter>
        <PlaceMap locations={locations} places={places} sets={sets} limits={limits} mode="view" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Huber P\./ }).getAttribute('href')).toBe('/tires/s1')

    fireEvent.click(screen.getByRole('button', { name: /CT – Container/ }))
    const levels = screen.getAllByText(/^E\d$/).map((e) => e.textContent)
    expect(levels).toEqual(['E2', 'E1'])
  })
})
