import { useMemo } from 'react'
import { useAllCourtesyCars } from '../courtesy-cars/courtesyCarApi'
import { useBookingsBetween } from './bookingApi'

/**
 * Which courtesy car the customer of a task has (or will get) in [from, to) – task ID → car name,
 * for the calendar cards. Bookings already returned are left out: the car is back.
 */
export function useCourtesyCarsByTask(from: string, to: string): ReadonlyMap<string, string> {
  const { data: bookings } = useBookingsBetween(from, to)
  const { data: cars } = useAllCourtesyCars()
  return useMemo(() => {
    const names = new Map((cars ?? []).map((car) => [car.id, car.name]))
    const byTask = new Map<string, string>()
    for (const booking of bookings ?? []) {
      if (booking.taskId && !booking.returnedAt) byTask.set(booking.taskId, names.get(booking.courtesyCarId) ?? 'Ersatzwagen')
    }
    return byTask
  }, [bookings, cars])
}
