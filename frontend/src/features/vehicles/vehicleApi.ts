import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Vehicle = components['schemas']['VehicleDto']
export type VehicleRequest = components['schemas']['VehicleRequest']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'vehicles'

/** All vehicles of a holder, active ones first. */
export function useVehiclesOfCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'of-customer', customerId],
    queryFn: async ({ signal }) =>
      dataOrThrow(await api.GET('/api/vehicles', { params: { query: { customerId: customerId! } }, signal })),
    enabled: customerId !== undefined,
  })
}

/** Create a local vehicle – e.g. a walk-in's car. */
export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: VehicleRequest) => dataOrThrow(await api.POST('/api/vehicles', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
