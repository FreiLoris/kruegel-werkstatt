import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../../components/ui/toastContext'
import { SeasonChangeView } from './SeasonChangeView'
import type { SeasonChange, SeasonEntry } from './tireSeasonApi'

// fictitious customers and tyres
const set = (id: string, name: string, more: object = {}) => ({
  id,
  customer: { displayName: name, mobile: '079 000 00 00', phone: null },
  vehicle: { licensePlate: null, description: 'VW Golf' },
  season: 'WINTER',
  kind: 'WHEELS',
  depths: { frontLeft: 6, frontRight: null, rearLeft: null, rearRight: null },
  place: 'OG-A1-1',
  state: 'IN_HOTEL',
  storedOn: '2026-04-01',
  ...more,
})
const entry = (group: SeasonEntry['group'], s: object, more: Partial<SeasonEntry> = {}) =>
  ({ group, set: s, changedOn: null, planned: null, ack: null, bothStored: false, ...more }) as SeasonEntry
let change: SeasonChange

vi.mock('./tireSeasonApi', () => ({
  useSeasonChange: () => ({ data: change, error: null }),
  useAcknowledge: () => ({ mutate: vi.fn(), isPending: false }),
  useUndoAcknowledge: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('../../lib/clock', () => ({ useToday: () => '2026-10-23' }))

function renderView(query = '', canEdit = true) {
  render(
    <MemoryRouter>
      <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
        <Routes>
          <Route path="/" element={<SeasonChangeView query={query} canEdit={canEdit} />} />
          <Route path="/tasks/new" element={<p>Wizard</p>} />
        </Routes>
      </ToastContext>
    </MemoryRouter>,
  )
}

const season = (overdue: boolean, entries: SeasonEntry[]) =>
  ({ season: 'WINTER', deadline: '2026-12-01', from: '2026-06-01', overdue, entries }) as SeasonChange

describe('SeasonChangeView (FB-21)', () => {
  it('the counters, then the ones to call first – "Gewechselt" folded at the end', () => {
    change = season(false, [
      entry('CHANGED', set('a', 'Huber'), { changedOn: '2026-10-16' }),
      entry('OPEN', set('b', 'Keller'), { bothStored: true }),
      entry('PLANNED', set('c', 'Frei'), { planned: { id: 't1', taskNumber: '26-0042', date: '2026-11-05' } }),
    ])
    renderView()

    expect(screen.getByRole('heading', { name: 'Wintersaison 2026' })).toBeTruthy()
    expect(screen.getByText('1 gewechselt · 1 geplant · 0 quittiert · 1 offen')).toBeTruthy()
    expect(screen.getByText(/noch 39 Tage/)).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Offen (1)', 'Termin geplant (1)', 'Gewechselt (1)'])

    const open = within(screen.getByRole('region', { name: 'Offen (1)' }))
    expect(open.getByText('Beide Sätze eingelagert – prüfen')).toBeTruthy()
    expect(open.getByRole('link', { name: /079 000 00 00/ }).getAttribute('href')).toBe('tel:0790000000')
    expect(within(screen.getByRole('region', { name: 'Termin geplant (1)' })).getByText(/am 05.11.2026/)).toBeTruthy()

    fireEvent.click(open.getByRole('button', { name: 'Termin abmachen' }))
    expect(screen.getByText('Wizard')).toBeTruthy()
  })

  it('after the deadline the open ones "forgot"', () => {
    change = season(true, [entry('OPEN', set('b', 'Keller'))])
    renderView()

    expect(screen.getByRole('heading', { name: 'Vergessen (1)' })).toBeTruthy()
    expect(screen.getByText(/ist vorbei/)).toBeTruthy()
  })

  it('the search of the hotel narrows it', () => {
    change = season(false, [entry('OPEN', set('b', 'Keller')), entry('OPEN', set('d', 'Meier'))])
    renderView('meier')

    expect(screen.queryByText('Keller')).toBeNull()
    expect(screen.getByText('Meier')).toBeTruthy()
  })

  it('without the right to edit: no buttons', () => {
    change = season(false, [entry('OPEN', set('b', 'Keller'))])
    renderView('', false)

    expect(screen.queryByRole('button', { name: 'Termin abmachen' })).toBeNull()
  })
})
