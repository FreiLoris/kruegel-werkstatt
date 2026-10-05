import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** Tasks of a period (both inclusive) – calendar and capacity overview. */
export function useTasksBetween(from: string, to: string) {
  return useQuery({
    queryKey: [TOPIC, 'between', from, to],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/tasks', { params: { query: { from, to } }, signal })),
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
