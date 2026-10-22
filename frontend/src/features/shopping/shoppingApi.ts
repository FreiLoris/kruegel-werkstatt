import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type ShoppingItem = components['schemas']['ShoppingItemDto']
export type ShoppingItemRequest = components['schemas']['ShoppingItemRequest']
export type ShoppingEntry = components['schemas']['ShoppingEntryDto']
export type ShoppingStatus = ShoppingItem['status']

/** Topic for query keys and live updates – same text as in the backend (ShoppingService.TOPIC). */
const TOPIC = 'shopping-items'

export const SHOPPING_STATUS: Record<ShoppingStatus, string> = {
  TO_ORDER: 'zu bestellen',
  ORDERED: 'bestellt',
  ARRIVED: 'geliefert',
}

/** After a change: the list – and the to-dos, the one who orders has one (FB-20) */
function refresh(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['todos'] })
  return queryClient.invalidateQueries({ queryKey: [TOPIC] })
}

/** Not arrived yet (to order first) – or the latest arrived ones */
export function useShoppingItems(arrived = false) {
  return useQuery({
    queryKey: [TOPIC, 'list', arrived],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/shopping-items', { params: { query: { arrived } }, signal })),
  })
}

/** All positions of a task, whatever their state (FB-19) */
export function useTaskShoppingItems(taskId: string) {
  return useQuery({
    queryKey: [TOPIC, 'task', taskId],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/shopping-items', { params: { query: { taskId } }, signal })),
  })
}

export function useShoppingItem(id: string | undefined) {
  return useQuery({
    queryKey: [TOPIC, 'one', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/shopping-items/{id}', { params: { path: { id: id! } }, signal })),
    enabled: !!id,
  })
}

/** Notes and changes of state – oldest first */
export function useShoppingEntries(id: string) {
  return useQuery({
    queryKey: [TOPIC, 'entries', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/shopping-items/{id}/entries', { params: { path: { id } }, signal })),
  })
}

/** Put on the list (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveShoppingItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: ShoppingItemRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/shopping-items/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/shopping-items', { body: request })),
    onSettled: () => refresh(queryClient),
  })
}

/** Ordered, arrived or back – no version, like ticking off a to-do. */
export function useChangeShoppingStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ShoppingStatus }) =>
      dataOrThrow(await api.PUT('/api/shopping-items/{id}/status', { params: { path: { id } }, body: { status } })),
    onSettled: () => refresh(queryClient),
  })
}

export function useAddShoppingNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      dataOrThrow(await api.POST('/api/shopping-items/{id}/entries', { params: { path: { id } }, body: { text } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/shopping-items/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => refresh(queryClient),
  })
}
