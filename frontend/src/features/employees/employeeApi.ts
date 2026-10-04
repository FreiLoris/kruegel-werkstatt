import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Employee = components['schemas']['EmployeeDto']
export type EmployeeRequest = components['schemas']['EmployeeRequest']
export type Role = Employee['role']

/** Display names (German) of the roles, in the order for selection fields. */
export const ROLES: Record<Role, string> = {
  MANAGEMENT: 'Geschäftsführung',
  MECHANIC: 'Mechaniker',
  OFFICE: 'Büro',
  APPRENTICE: 'Lernender',
  INTERN: 'Praktikum',
}

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'employees'

/** All employees including former ones, in fixed order (for administration). */
export function useAllEmployees() {
  return useQuery({
    queryKey: [TOPIC, 'all'],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/employees', { params: { query: { includeInactive: true } }, signal })),
  })
}

/** Only active ones, in fixed order – for selection lists and "Who am I?". */
export function useActiveEmployees() {
  return useQuery({
    queryKey: [TOPIC, 'active'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/employees', { signal })),
  })
}

/**
 * Create (without `id`) or edit (with `id`; the request then contains the loaded `version`).
 *
 * The list is reloaded after saving. The live update would do that too, but this way the own
 * device sees the change right away even if the live connection is interrupted at the moment.
 */
export function useSaveEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: EmployeeRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/employees/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/employees', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Deactivate (person left the business) or activate again. */
export function useSetEmployeeActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/employees/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/employees/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Save a new order: first ID = front (pinboard columns, selection lists). */
export function useReorderEmployees() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => dataOrThrow(await api.PUT('/api/employees/order', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
