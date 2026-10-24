import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { todayIso } from '../../lib/format'
import { TodayByLift } from './TodayByLift'

// fictitious
const lifts = [
  { id: '1', name: 'Lift 1', active: true },
  { id: '2', name: 'Lift 2', active: true },
]
const task = (id: string, liftId: string, date: string, time: string, name: string) => ({
  id,
  liftId,
  date,
  time,
  endAt: `${date}T18:00:00`,
  status: 'RECEIVED',
  waitingCustomer: false,
  mechanicId: null,
  customer: { displayName: name },
  vehicle: null,
  serviceItemIds: [],
  tireChange: false,
  mfk: false,
  workDescription: null,
})

let today: ReturnType<typeof task>[] = []
let mfk: unknown[] = []
let todayError: Error | null = null
let carried: unknown[] = []
const ahead = [task('n', '1', '2099-03-02', '08:00:00', 'Huber Peter')]

vi.mock('../tasks/taskApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../tasks/taskApi')>()),
  useTasksOfDay: () => ({ data: today, error: todayError }),
  useTasksBetween: () => ({ data: ahead, error: null }),
  useMfkSlots: () => ({ data: mfk }),
  useCarriedOver: () => ({ data: carried }),
}))
vi.mock('../lifts/liftApi', () => ({ useAllLifts: () => ({ data: lifts }) }))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('../service-items/serviceItemApi', () => ({ useAllServiceItems: () => ({ data: [] }) }))
vi.mock('../inspection-stations/inspectionStationApi', () => ({
  // fictitious
  useInspectionStations: () => ({ data: [{ id: 's1', name: 'Prüfstelle Muster' }] }),
}))

function renderToday() {
  render(
    <MemoryRouter>
      <TodayByLift />
    </MemoryRouter>,
  )
}

describe('TodayByLift', () => {
  it('a column per lift; an empty lift says "frei"', () => {
    today = [task('a', '1', todayIso(), '07:30:00', 'Beispiel Anna')]
    renderToday()

    expect(screen.getByRole('region', { name: 'Lift 1' }).textContent).toContain('Beispiel Anna')
    expect(screen.getByRole('region', { name: 'Lift 2' }).textContent).toContain('frei')
  })

  it('an MFK appointment today stands in "Ohne Lift" – also on a day without tasks', () => {
    today = []
    mfk = [
      { task: { id: 'm', customer: { displayName: 'Muster Max' }, vehicle: null, mfkDriverId: null, mfkStationId: 's1' }, date: todayIso(), start: '10:00', end: '11:00' },
    ]
    renderToday()

    expect(screen.getByRole('region', { name: 'Ohne Lift' }).textContent).toContain('MFK10:00–11:00Muster MaxPrüfstelle Muster')
    expect(screen.getByRole('region', { name: 'Lift 1' }).textContent).toContain('frei')
    mfk = []
  })

  it('no appointment today: names the next one instead of an empty area', () => {
    today = []
    renderToday()

    expect(screen.getByText('Keine Termine heute')).toBeTruthy()
    expect(screen.getByText(/Nächster: Mo 02\.03\. 08:00 · Huber Peter/)).toBeTruthy()
  })

  it('keeps the tasks on the TV when only a refetch fails (e.g. backend restarting)', () => {
    today = [task('a', '1', todayIso(), '08:00:00', 'Muster Anna')]
    todayError = new Error('Keine gültige Antwort vom Server.')

    renderToday()

    expect(screen.getByText('Muster Anna')).toBeTruthy()
    expect(screen.queryByText(/konnten nicht geladen werden/)).toBeNull()
    todayError = null
  })

  it('a task not finished yesterday stands in "Ohne Lift" with since when (FB-14)', () => {
    carried = [{ ...task('c', '1', '2099-03-01', '08:00:00', 'Meier Anna'), endAt: '2026-10-12T17:00:00' }]
    renderToday()

    const noLift = screen.getByRole('region', { name: 'Ohne Lift' })
    expect(noLift.textContent).toContain('Meier Anna')
    expect(noLift.textContent).toContain('verlängert seit Mo 12.10.')
    carried = []
  })

  it('every carried-over task is an item of its own – "+ n weitere" on the TV counts tasks, not the block', () => {
    carried = [
      { ...task('c1', '1', '2099-03-01', '08:00:00', 'Meier Anna'), endAt: '2026-10-12T17:00:00' },
      { ...task('c2', '1', '2099-03-01', '09:00:00', 'Huber Beat'), endAt: '2026-10-12T17:00:00' },
    ]
    renderToday()

    const items = within(screen.getByRole('region', { name: 'Ohne Lift' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([expect.stringContaining('Meier Anna'), expect.stringContaining('Huber Beat')])
    carried = []
  })
})
