import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Todo = components['schemas']['TodoDto']
export type TodoRequest = components['schemas']['TodoRequest']

/** Topic for query keys and live updates – same text as in the backend (TodoService.TOPIC). */
const TOPIC = 'todos'

/** Which to-dos: empty fields = all */
export interface TodoFilter {
  /** false = open ones by deadline; true = the latest done ones */
  done?: boolean
  assigneeId?: string
  /** only those nobody takes care of yet */
  unassigned?: boolean
  shopping?: boolean
  taskId?: string
  /** only the sub-tasks of this note */
  noteId?: string
}

export function useTodos(filter: TodoFilter) {
  return useQuery({
    queryKey: [TOPIC, filter],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/todos', { params: { query: filter }, signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: TodoRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/todos/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/todos', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Tick off or undo – no version, like the task status. */
export function useSetTodoDone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) =>
      dataOrThrow(await api.PUT('/api/todos/{id}/done', { params: { path: { id } }, body: { done } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/todos/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** The open to-dos on the pinboard (not the shopping list) – updated right away when one is dragged */
export const BOARD_TODOS: TodoFilter = { shopping: false }

/** Dragged to another column on the pinboard: someone else (or nobody) takes care of it. */
export function useReassignTodo() {
  const queryClient = useQueryClient()
  const key = [TOPIC, BOARD_TODOS]
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string | null; arranged: Todo[] }) =>
      dataOrThrow(await api.PUT('/api/todos/{id}/assignee', { params: { path: { id } }, body: { assigneeId } })),
    onMutate: async ({ arranged }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Todo[]>(key)
      queryClient.setQueryData(key, arranged)
      return { previous }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}
