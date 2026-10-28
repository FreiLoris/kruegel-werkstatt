import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type CustomerCall = components['schemas']['CustomerCallDto']
export type CallOutcome = CustomerCall['outcome']

/** Topic for query keys and live updates – same text as in the backend (CustomerCallService.TOPIC). */
const TOPIC = 'customer-calls'

export const OUTCOMES: Record<CallOutcome, string> = {
  REACHED: 'erreicht',
  NOT_REACHED: 'nicht erreicht',
  CALLBACK: 'Rückruf',
}

/** The latest call of each of these customers (FB-16, FB-21) – by customer id; never called = missing */
export function useLatestCalls(customerIds: string[]) {
  const ids = [...new Set(customerIds)].sort()
  return useQuery({
    queryKey: [TOPIC, 'latest', ids],
    queryFn: async ({ signal }) =>
      ids.length === 0
        ? []
        : dataOrThrow(await api.GET('/api/customer-calls/latest', { params: { query: { customerIds: ids } }, signal })),
    select: (calls) => new Map(calls.map((call) => [call.customerId, call])),
  })
}

export function useNoteCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ customerId, outcome }: { customerId: string; outcome: CallOutcome }) =>
      dataOrThrow(await api.POST('/api/customers/{customerId}/calls', { params: { path: { customerId } }, body: { outcome } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useDeleteCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => dataOrThrow(await api.DELETE('/api/customer-calls/{id}', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
