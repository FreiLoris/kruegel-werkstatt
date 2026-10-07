import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { dataOrThrow } from '../../api/errors'
import type { components } from '../../api/schema'

export type Note = components['schemas']['NoteDto']
export type NoteRequest = components['schemas']['NoteRequest']

/** Topic for query keys and live updates – same text as in the backend (NoteService.TOPIC). */
const TOPIC = 'notes'

/** Which notes: empty fields = all */
export interface NoteFilter {
  /** false = on the board; true = the archive */
  archived?: boolean
  assigneeId?: string
  unassigned?: boolean
  taskId?: string
  /** archive only: words in text or info */
  q?: string
}

export function useNotes(filter: NoteFilter) {
  return useQuery({
    queryKey: [TOPIC, filter],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/notes', { params: { query: filter }, signal })),
  })
}

/** Create (without `id`) or edit (with `id`; the request then contains the loaded `version`). */
export function useSaveNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id?: string; request: NoteRequest }) =>
      id
        ? dataOrThrow(await api.PUT('/api/notes/{id}', { params: { path: { id } }, body: request }))
        : dataOrThrow(await api.POST('/api/notes', { body: request })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Archive (ticks off the open sub-tasks) or back on the board (reopens exactly those). */
export function useSetNoteArchived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      dataOrThrow(await api.PUT('/api/notes/{id}/archived', { params: { path: { id } }, body: { archived } })),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TOPIC] })
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
