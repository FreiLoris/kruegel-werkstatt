import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AbsenceStatisticsView } from './AbsenceStatisticsView'

// fictitious
const statistics = {
  year: 2025,
  people: [
    {
      employeeId: 'r',
      name: 'Reto',
      active: true,
      vacationEntitlement: 20,
      vacationTaken: 18,
      vacationPlanned: 4.5,
      vacationLeft: -2.5,
      sickDays: 1,
      trainingDays: 0.5,
      externalWorkDays: 3,
    },
  ],
  companies: [{ company: 'Garage Muster AG', days: 3, assignments: 2, employeeIds: ['r'] }],
}

const useAbsenceStatistics = vi.fn((year: number) => ({ data: year === 2025 ? statistics : undefined, error: null }))
// the employees are still loading – the statistics are already there (happened in the browser)
const useAllEmployees = vi.fn(() => ({ data: undefined }))

vi.mock('./absenceApi', () => ({ useAbsenceStatistics: (year: number) => useAbsenceStatistics(year) }))
vi.mock('../employees/employeeApi', () => ({ useAllEmployees: () => useAllEmployees() }))

describe('AbsenceStatisticsView', () => {
  it('shows the year from the address, also before the employees have loaded', () => {
    render(
      <MemoryRouter initialEntries={['/employees?view=statistics&year=2025']}>
        <AbsenceStatisticsView />
      </MemoryRouter>,
    )

    expect(useAbsenceStatistics).toHaveBeenCalledWith(2025)
    expect(screen.getByRole('heading', { name: '2025' })).toBeTruthy()
    expect(screen.getAllByText('Reto').length).toBeGreaterThan(0)
    // more than the entitlement: shown negative, with a real minus
    expect(screen.getByText('−2.5')).toBeTruthy()
    expect(screen.getByRole('img', { name: '18 bezogen, 4.5 geplant von 20 Tagen' })).toBeTruthy()
    expect(screen.getByText('Garage Muster AG')).toBeTruthy()
  })
})
