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

/** The buttons, in this order */
export const OUTCOME_ORDER: readonly CallOutcome[] = ['REACHED', 'NOT_REACHED', 'CALLBACK']

/** How long one's own call can be deleted – like the server (CustomerCallService.DELETABLE) */
const DELETABLE_MINUTES = 30

/**
 * One's own call, just noted – the only one that can be deleted (tapped by mistake)
 *
 * @param now the local time of the app's clock, "2026-10-28T15:05"
 */
export const isDeletable = (call: Pick<CustomerCall, 'calledAt' | 'calledBy'>, person: string | undefined, now: string) =>
  !!person && call.calledBy === person && Date.parse(now) - Date.parse(call.calledAt) < DELETABLE_MINUTES * 60_000

/**
 * The latest call of every customer called in the last half year (FB-16, FB-21) – by customer id;
 * not called = missing. One list for all views: no ids in the address.
 */
export function useLatestCalls() {
  return useQuery({
    queryKey: [TOPIC, 'latest'],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/customer-calls/latest', { signal })),
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
