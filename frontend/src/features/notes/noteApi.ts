import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TodoRequest } from '../todos/todoApi'
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

/** One note – the dialog loads it itself, so it works for board and archive alike. */
export function useNote(id: string) {
  return useQuery({
    queryKey: [TOPIC, 'one', id],
    queryFn: async ({ signal }) => dataOrThrow(await api.GET('/api/notes/{id}', { params: { path: { id } }, signal })),
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

/** Query key of the whole board (all notes on it) – updated right away when a card is dragged */
export const BOARD: NoteFilter = {}

/**
 * Drag & drop on the pinboard: the card is shown in its new column right away (`arranged`);
 * if the server refuses, the board jumps back. Empty person = the column "Neu".
 */
export function useMoveNote() {
  const queryClient = useQueryClient()
  const key = [TOPIC, BOARD]
  return useMutation({
    mutationFn: async ({ id, fromEmployeeId, toEmployeeId }: { id: string; fromEmployeeId?: string; toEmployeeId?: string; arranged: Note[] }) =>
      dataOrThrow(await api.PUT('/api/notes/{id}/move', { params: { path: { id } }, body: { fromEmployeeId, toEmployeeId } })),
    onMutate: async ({ arranged }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Note[]>(key)
      queryClient.setQueryData(key, arranged)
      return { previous }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [TOPIC] }),
  })
}

/** Deleted for good, with its sub-tasks (normally a note is archived). */
export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE('/api/notes/{id}', { params: { path: { id } } })
      if (!response.ok) dataOrThrow({ error, response })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TOPIC] })
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

/** A sub-task: an ordinary to-do of the note – it appears in the to-do lists too. */
export function useAddNoteTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ noteId, request }: { noteId: string; request: TodoRequest }) =>
      dataOrThrow(await api.POST('/api/notes/{id}/todos', { params: { path: { id: noteId } }, body: request })),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [TOPIC] })
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
