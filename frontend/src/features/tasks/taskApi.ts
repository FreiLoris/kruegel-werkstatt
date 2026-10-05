import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Task = components['schemas']['TaskDto']
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
  TO_ORDER: 'Zum bestellen',
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
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks', { params: { query: { from, to } }, signal })),
  })
}

export function tasksOfDayKey(date: string) {
  return [TOPIC, 'day', date] as const
}

/** Tasks that take time on a day – also those of earlier days still on their lift (day view, wizard). */
export function useTasksOfDay(date: string | undefined) {
  return useQuery({
    queryKey: tasksOfDayKey(date ?? ''),
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks/day', { params: { query: { date: date! } }, signal })),
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

/** SwissGarage order number; empty removes it. */
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
