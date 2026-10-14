import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type StockItem = components['schemas']['StockItemDto']
export type StockItemRequest = components['schemas']['StockItemRequest']
export type StockCategory = StockItem['category']

/** Topic for query keys and live updates – same text as in the backend. */
const TOPIC = 'stock-items'

/** German labels, in the order of the filter and the form */
export const CATEGORY_LABEL: Record<StockCategory, string> = {
  SPARE_PART: 'Ersatzteile',
  CONSUMABLE: 'Verbrauchsmaterial',
  TOOL: 'Werkzeuge',
}

/** The whole stock list – the page searches, filters and sorts it itself. */
export function useStockItems() {
  return useQuery({
    queryKey: [TOPIC],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/stock-items', { signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveStockItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: StockItemRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/stock-items/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/stock-items', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useDeleteStockItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/stock-items/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
