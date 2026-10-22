import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { WeekView } from './WeekView'

// fictitious task on Wednesday
const task = {
  id: 't1',
  status: 'RECEIVED',
  date: '2026-10-21',
  time: '08:00:00',
  endAt: '2026-10-21T09:00:00',
  timeOpen: false,
  waitingCustomer: false,
  liftId: null,
  mechanicId: null,
  mfk: false,
  mfkAppointment: null,
  customer: { displayName: 'Muster AG' },
  vehicle: null,
}

vi.mock('../taskApi', async (original) => ({
  ...(await original<typeof import('../taskApi')>()),
  useTasksBetween: () => ({ data: [task], error: null }),
  useMfkSlots: () => ({ data: [] }),
  useCarriedOver: () => ({ data: [] }),
  useScheduleTask: () => ({ mutate: vi.fn() }),
}))
vi.mock('../../lifts/liftApi', () => ({ useAllLifts: () => ({ data: [] }) }))
vi.mock('../../employees/employeeApi', () => ({ useAllEmployees: () => ({ data: [] }) }))
vi.mock('../../publicholidays/publicHolidayApi', () => ({ usePublicHolidays: () => ({ data: [] }) }))
vi.mock('../../absences/absenceApi', () => ({ useAbsences: () => ({ data: [] }) }))
vi.mock('../../bookings/useCourtesyCarsByTask', () => ({ useCourtesyCarsByTask: () => new Map() }))
vi.mock('../../../app/person/useDevicePerson', () => ({ useCanEdit: () => true }))
vi.mock('../../../components/ui/toastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

function renderWeek(readOnly: boolean, onOpenDay = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/plan']}>
      <Routes>
        <Route path="/plan" element={<WeekView monday="2026-10-19" onOpenDay={onOpenDay} readOnly={readOnly} />} />
        <Route path="/tasks/:id" element={<p>Auftragsseite</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return onOpenDay
}

describe('WeekView', () => {
  it('a card opens its task', () => {
    renderWeek(false)
    fireEvent.click(screen.getByText('Muster AG'))
    expect(screen.getByText('Auftragsseite')).toBeTruthy()
  })

  it('only to look at (the wizard, FB-13): nothing to drag, a card opens its day – not the task', () => {
    const onOpenDay = renderWeek(true)
    const card = screen.getByText('Muster AG').closest('[role="button"]')!

    expect(card.getAttribute('aria-roledescription')).toBeNull()
    fireEvent.click(card)
    expect(onOpenDay).toHaveBeenCalledWith('2026-10-21')
    expect(screen.queryByText('Auftragsseite')).toBeNull()
  })
})
