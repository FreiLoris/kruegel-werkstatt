import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Task = components['schemas']['TaskDto']
export type TaskStatus = Task['status']

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

/** The last 10 tasks of a customer, newest first (wizard step 1). */
export function useCustomerHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'history', customerId],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/tasks/history', { params: { query: { customerId: customerId! } }, signal })),
    enabled: customerId !== undefined,
  })
}
