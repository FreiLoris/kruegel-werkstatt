import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Insurance = components['schemas']['InsuranceDto']
export type InsuranceRequest = components['schemas']['InsuranceRequest']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'insurances'

/** All insurances by name, also the ones no longer used – old tasks still name them. */
export function useInsurances() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/insurances', { signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveInsurance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: InsuranceRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/insurances/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/insurances', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** No longer use (instead of delete) or use again. */
export function useSetInsuranceActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      active
        ? dataOrThrow(await api.POST('/api/insurances/{id}/activate', { params: { path: { id } } }))
        : dataOrThrow(await api.POST('/api/insurances/{id}/deactivate', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
