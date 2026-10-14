import { render, screen } from '@testing-library/react'
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
})

let today: ReturnType<typeof task>[] = []
let mfk: unknown[] = []
const ahead = [task('n', '1', '2099-03-02', '08:00:00', 'Huber Peter')]

vi.mock('../tasks/taskApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../tasks/taskApi')>()),
  useTasksOfDay: () => ({ data: today, error: null }),
  useTasksBetween: () => ({ data: ahead, error: null }),
  useMfkSlots: () => ({ data: mfk }),
}))
vi.mock('../lifts/liftApi', () => ({ useAllLifts: () => ({ data: lifts }) }))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [] }) }))

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
    mfk = [{ task: { id: 'm', customer: { displayName: 'Muster Max' }, vehicle: null, mfkDriverId: null }, date: todayIso(), start: '10:00', end: '11:00' }]
    renderToday()

    expect(screen.getByRole('region', { name: 'Ohne Lift' }).textContent).toContain('MFK10:00–11:00Muster Max')
    expect(screen.getByRole('region', { name: 'Lift 1' }).textContent).toContain('frei')
    mfk = []
  })

  it('no appointment today: names the next one instead of an empty area', () => {
    today = []
    renderToday()

    expect(screen.getByText('Keine Termine heute')).toBeTruthy()
    expect(screen.getByText(/Nächster: Mo 02\.03\. 08:00 · Huber Peter/)).toBeTruthy()
  })
})
