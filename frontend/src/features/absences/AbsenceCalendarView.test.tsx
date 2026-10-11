import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Employee } from '../employees/employeeApi'
import { AbsenceCalendarView } from './AbsenceCalendarView'
import type { NewAbsence } from './AbsenceDialog'

// fictitious
const carina = { id: 'c', name: 'Carina', color: '#9fc8f0', active: true } as unknown as Employee
const dialog = vi.fn()

vi.mock('../../lib/clock', () => ({ useToday: () => '2026-10-13' }))
vi.mock('../../app/person/useDevicePerson', () => ({
  useCanEdit: () => true,
  useDevicePerson: () => ({ kind: 'person', person: carina }),
}))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [carina] }) }))
vi.mock('../publicholidays/publicHolidayApi', () => ({ usePublicHolidays: () => ({ data: [] }) }))
vi.mock('./absenceApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./absenceApi')>()),
  useAbsences: () => ({ data: [] }),
}))
vi.mock('./AbsenceCalendar', () => ({ AbsenceCalendar: () => <p>Kalender</p> }))
vi.mock('./AbsenceDialog', () => ({
  AbsenceDialog: (props: { fresh?: NewAbsence }) => {
    dialog(props)
    return <p>Dialog</p>
  },
}))

beforeEach(() => dialog.mockClear())

const renderView = () =>
  render(
    <MemoryRouter>
      <AbsenceCalendarView />
    </MemoryRouter>,
  )

describe('AbsenceCalendarView', () => {
  it('"Anwesenheit" has its own button: the person of the device, today, "Anwesend"', () => {
    renderView()

    fireEvent.click(screen.getByRole('button', { name: 'Anwesenheit' }))

    expect(dialog.mock.lastCall?.[0].fresh).toEqual({ employeeId: 'c', startDate: '2026-10-13', endDate: '2026-10-13', category: 'PRESENT' })
  })

  it('"Abwesenheit" opens the empty form – for whom and when is asked there', () => {
    renderView()

    fireEvent.click(screen.getByRole('button', { name: 'Abwesenheit' }))

    expect(dialog.mock.lastCall?.[0].fresh).toBeUndefined()
  })
})
