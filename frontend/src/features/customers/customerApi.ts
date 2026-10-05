import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type CustomerRequest = components['schemas']['CustomerRequest']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'customers'

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
