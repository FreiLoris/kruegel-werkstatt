import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'
import { mfkSlotsOf } from './mfk/mfkSlots'

/** A task as the API delivers it – it may have no appointment yet (12d-3: list "Ohne Termin") */
export type AnyTask = components['schemas']['TaskDto']

/**
 * A planned task: it has a day, a time and an end. Everything in the calendars is one – the day,
 * week and period endpoints only deliver planned tasks – so the views there need no "if no date".
 */
export type Task = AnyTask & { date: string; time: string; endAt: string }

/** Has the task an appointment? Narrows {@link AnyTask} to {@link Task}. */
export const isPlanned = (task: AnyTask): task is Task => task.date !== null

export type TaskStatus = Task['status']
export type TaskRequest = components['schemas']['TaskRequest']
export type TireChangeKind = NonNullable<Task['tireChangeKind']>
export type PartsStatus = NonNullable<Task['parts']>['status']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'tasks'

/**
 * Status texts – the ONE place for them (F10: the old app had three different spellings).
 * Colors follow with the calendar views.
 */
export const TASK_STATUS: Record<TaskStatus, string> = {
  RECEIVED: 'Eingang',
  IN_PROGRESS: 'In Arbeit',
  WAITING_FOR_PARTS: 'Wartet auf Material',
  DONE: 'Fertig',
}

/** Radwechsel-Art – wording of the old app */
export const TIRE_CHANGE_KINDS: Record<TireChangeKind, string> = {
  WHEELS_STORED: 'Räder eingelagert',
  TIRES_STORED: 'Reifen eingelagert',
  WHEELS_BROUGHT: 'Räder mitgebracht',
  TIRES_BROUGHT: 'Reifen mitgebracht',
}

export const PARTS_STATUS: Record<PartsStatus, string> = {
  TO_ORDER: 'Zu bestellen',
  ORDERED: 'Bestellt',
  ARRIVED: 'Angekommen',
}

/** Query key of a period – also used to update the week view right away when moving a card. */
export function tasksBetweenKey(from: string, to: string) {
  return [TOPIC, 'between', from, to] as const
}

/** Tasks of a period (both inclusive) – calendar and capacity overview. */
export function useTasksBetween(from: string, to: string) {
  return useQuery({
    queryKey: tasksBetweenKey(from, to),
    // by the day of their start – only planned tasks have one
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks', { params: { query: { from, to } }, signal })) as Task[],
  })
}

/**
 * The MFK appointments of a period (both inclusive) as slots – the hints in the calendars (FB-10).
 * Also of orders without workshop appointment: the inspection is still booked.
 */
export function useMfkSlots(from: string, to: string) {
  return useQuery({
    queryKey: [TOPIC, 'mfk', from, to],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/mfk', { params: { query: { from, to } }, signal })),
    select: mfkSlotsOf,
  })
}

export function tasksOfDayKey(date: string) {
  return [TOPIC, 'day', date] as const
}

/** Tasks that take time on a day – also those of earlier days still on their lift (day view, wizard). */
export function useTasksOfDay(date: string | undefined) {
  return useQuery({
    queryKey: tasksOfDayKey(date ?? ''),
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/day', { params: { query: { date: date! } }, signal })) as Task[],
    enabled: !!date,
  })
}

/** The last 10 tasks of a customer, newest first (wizard step 1). */
export function useCustomerHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'history', customerId],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/tasks/history', { params: { query: { customerId: customerId! } }, signal })),
    enabled: customerId !== undefined,
  })
}

/** A single task, e.g. for the task sheet. */
export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'one', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/{id}', { params: { path: { id: id! } }, signal })),
    enabled: id !== undefined,
  })
}

/** Create a task (wizard). Calendar and history are reloaded afterwards. */
export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: TaskRequest) => dataOrThrow(await api.POST('/api/tasks', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export type TaskSchedule = components['schemas']['TaskScheduleRequest']

/**
 * Drag & drop in day and week view: new lift, start and end. The task is shown at its new place
 * right away (`arranged`); if the server refuses, the view jumps back.
 */
export function useScheduleTask(viewKey: QueryKey) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, schedule }: { id: string; schedule: TaskSchedule; arranged: Task[] }) =>
      dataOrThrow(await api.PUT('/api/tasks/{id}/schedule', { params: { path: { id } }, body: schedule })),
    onMutate: async ({ arranged }) => {
      await queryClient.cancelQueries({ queryKey: viewKey })
      const previous = queryClient.getQueryData<Task[]>(viewKey)
      queryClient.setQueryData(viewKey, arranged)
      return { previous }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(viewKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Search over ALL appointments (F11), from 2 characters; previous hits stay while typing. */
export function useTaskSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: [TOPIC, 'search', q],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/search', { params: { query: { q } }, signal })),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  })
}

/** Edit with the loaded `version` (409 if someone else saved in between). */
export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: TaskRequest }) =>
      dataOrThrow(await api.PUT('/api/tasks/{id}', { params: { path: { id } }, body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Status on its own – no version, it must not fail because of an unrelated edit. */
export function useChangeTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) =>
      dataOrThrow(await api.PUT('/api/tasks/{id}/status', { params: { path: { id } }, body: { status } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Orders without appointment – taken but not planned yet, or taken out of the plan again (12d-3). */
export function useTasksWithoutAppointment() {
  return useQuery({
    queryKey: [TOPIC, 'without-appointment'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/without-appointment', { signal })),
  })
}

/** Take a planned task out of the plan: day, time and lift become free, the order stays. */
export function useRemoveAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => dataOrThrow(await api.DELETE('/api/tasks/{id}/appointment', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Tasks whose parts are still to be ordered – they appear on the shopping list (12c). */
export function usePartsToOrder() {
  return useQuery({
    queryKey: [TOPIC, 'parts-to-order'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/parts-to-order', { signal })),
  })
}

/** Parts ordered / arrived – no version, like the status. */
export function useChangePartsStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PartsStatus }) =>
      dataOrThrow(await api.PUT('/api/tasks/{id}/parts-status', { params: { path: { id } }, body: { status } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Change the task number – it can be changed, not removed. */
export function useAssignTaskNumber() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskNumber }: { id: string; taskNumber: string }) =>
      dataOrThrow(await api.PUT('/api/tasks/{id}/task-number', { params: { path: { id } }, body: { taskNumber } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/tasks/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSuccess: (_result, id) => {
      // the deleted task itself is gone – reloading it would only give "not found"
      queryClient.removeQueries({ queryKey: [TOPIC, 'one', id] })
      void queryClient.invalidateQueries({ queryKey: [TOPIC] })
    },
  })
}
