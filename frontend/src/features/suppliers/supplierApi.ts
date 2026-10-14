import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Supplier = components['schemas']['SupplierDto']
export type SupplierRequest = components['schemas']['SupplierRequest']
export type OrderChannel = NonNullable<Supplier['orderChannel']>

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'suppliers'

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  WEBSHOP: 'Webshop',
  PHONE: 'Telefon',
  EMAIL: 'E-Mail',
}

/** All suppliers by name */
export function useSuppliers() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/suppliers', { signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: SupplierRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/suppliers/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/suppliers', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Its articles in the stock list lose it – those are reloaded too. */
export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/suppliers/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TOPIC] })
      void queryClient.invalidateQueries({ queryKey: ['stock-items'] })
    },
  })
}
