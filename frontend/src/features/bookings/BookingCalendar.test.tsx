import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../../components/ui/toastContext'
import type { Booking } from './bookingApi'
import { BookingCalendar } from './BookingCalendar'

// fictitious: one car, out with someone on the day of the task
const booking = {
  id: 'b1',
  courtesyCarId: 'c1',
  holderName: 'Muster Max',
  pickupAt: '2026-11-02T08:00:00',
  returnAt: '2026-11-02T17:00:00',
  returnedAt: null,
} as unknown as Booking

vi.mock('../courtesy-cars/courtesyCarApi', () => ({
  useAllCourtesyCars: () => ({ data: [{ id: 'c1', name: 'Ersatzwagen 1', licensePlate: 'ZH 1', active: true }] }),
}))
vi.mock('./bookingApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./bookingApi')>()),
  useBookingsBetween: () => ({ data: [booking], error: null }),
}))
vi.mock('../publicholidays/publicHolidayApi', () => ({ useHolidayNames: () => new Map() }))
vi.mock('../../lib/clock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/clock')>()),
  useClock: () => ({ today: '2026-10-28', time: '10:00' }),
  useToday: () => '2026-10-28',
}))

const renderCalendar = (pickupAt: string | null, returnAt: string | null, excludeBookingId?: string) =>
  render(
    <ToastContext value={{ success: vi.fn(), error: vi.fn(), info: vi.fn() }}>
      <BookingCalendar pickupAt={pickupAt} returnAt={returnAt} excludeBookingId={excludeBookingId} onPick={vi.fn()} />
    </ToastContext>,
  )

describe('BookingCalendar (FB-32)', () => {
  it('starts two days before the pickup', () => {
    renderCalendar('2026-11-02T08:00', '2026-11-02T17:00')

    expect(screen.getByText(/Belegung ab 31\.10\.2026/)).toBeTruthy()
    expect(screen.getByTitle(/Muster Max/)).toBeTruthy()
  })

  it('a task without appointment or a cleared field: from today, no crash', () => {
    renderCalendar('', '')
    expect(screen.getByText(/Belegung ab 26\.10\.2026/)).toBeTruthy()

    renderCalendar('T08:00', '2026-11-02T')
    expect(screen.getAllByText(/Belegung ab 26\.10\.2026/)).toHaveLength(2)
  })

  it('the booking being changed is not shown – the shaded period is where it goes', () => {
    renderCalendar('2026-11-02T08:00', '2026-11-02T17:00', 'b1')

    expect(screen.queryByTitle(/Muster Max/)).toBeNull()
  })
})
