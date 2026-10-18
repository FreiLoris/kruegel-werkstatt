import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type CustomerRequest = components['schemas']['CustomerRequest']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'customers'

/** One customer – the customer page (UX G-05). */
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'one', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/customers/{id}', { params: { path: { id: id! } }, signal })),
    enabled: id !== undefined,
  })
}

/** Create a local customer (walk-in). SwissGarage customers come from the import. */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CustomerRequest) => dataOrThrow(await api.POST('/api/customers', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Edit a local customer (SwissGarage customers → 409, they are changed in SwissGarage). */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: CustomerRequest }) =>
      dataOrThrow(await api.PUT('/api/customers/{id}', { params: { path: { id } }, body: request })),
    // tasks show customer data too
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: [TOPIC] }), queryClient.invalidateQueries({ queryKey: ['tasks'] })]),
  })
}

/** Local customers no longer used – to use them again (settings). */
export function useInactiveCustomers() {
  return useQuery({
    queryKey: [TOPIC, 'inactive'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/customers/inactive', { signal })),
  })
}

/** "Nicht mehr verwenden" / "Wieder verwenden" – only local customers (SwissGarage ones follow the import). */
export function useSetCustomerActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      dataOrThrow(
        active
          ? await api.POST('/api/customers/{id}/activate', { params: { path: { id } } })
          : await api.POST('/api/customers/{id}/deactivate', { params: { path: { id } } }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

