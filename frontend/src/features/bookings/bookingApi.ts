import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Booking = components['schemas']['BookingDto']
export type BookingRequest = components['schemas']['BookingRequest']
export type Availability = components['schemas']['AvailabilityDto']
export type TaskWithBookingRequest = components['schemas']['TaskWithBookingRequest']

/** Topic for query keys and live updates – same text as in the backend (BookingService.TOPIC). */
const TOPIC = 'courtesy-car-bookings'

/**
 * THE availability check (bug #2: the old app had three different ones). Only asked for a valid
 * period; while the period is changed the previous answer stays visible.
 *
 * @param excludeBookingId a booking being moved – it does not count against itself
 */
export function useAvailability(from: string | null, to: string | null, excludeBookingId?: string) {
  return useQuery({
    queryKey: [TOPIC, 'availability', from, to, excludeBookingId],
    queryFn: async ({ signal }) =>
      dataOrThrow(
        await api.GET('/api/courtesy-car-bookings/availability', {
          params: { query: { from: from!, to: to!, excludeBookingId } },
          signal,
        }),
      ),
    enabled: from !== null && to !== null && to > from,
    placeholderData: keepPreviousData,
  })
}

/** Bookings whose planned period touches [from, to) – courtesy car page (max. 92 days). */
export function useBookingsBetween(from: string, to: string) {
  return useQuery({
    queryKey: [TOPIC, 'period', from, to],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/courtesy-car-bookings', { params: { query: { from, to } }, signal })),
    placeholderData: keepPreviousData,
  })
}

/** Bookings of a task (task detail, task sheet). */
export function useTaskBookings(taskId: string) {
  return useQuery({
    queryKey: [TOPIC, 'task', taskId],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/courtesy-car-bookings/task/{taskId}', { params: { path: { taskId } }, signal })),
  })
}

/** Book (without `id`) or move (with `id`; the request then contains the loaded `version`). */
export function useSaveBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: BookingRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/courtesy-car-bookings/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/courtesy-car-bookings', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/courtesy-car-bookings/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** The car is back now – or undo a return recorded by mistake. */
export function useReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, undo }: { id: string; undo: boolean }) =>
      undo
        ? dataOrThrow(await api.DELETE('/api/courtesy-car-bookings/{id}/return', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/courtesy-car-bookings/{id}/return', { params: { path: { id } }, body: {} })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Wizard: task and courtesy car together – both or neither. */
export function useCreateTaskWithBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: TaskWithBookingRequest) => dataOrThrow(await api.POST('/api/tasks/with-courtesy-car', { body: request })),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void queryClient.invalidateQueries({ queryKey: [TOPIC] })
    },
  })
}
