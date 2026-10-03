import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { datenOderFehler } from '../../api/fehler'
import type { components } from '../../api/schema'

export type Lift = components['schemas']['LiftDto']

/** Bereich für Query-Keys und Live-Updates – derselbe Text wie im Backend. */
const BEREICH = 'lifts'

/** Alle Lifts inkl. stillgelegte, in fester Reihenfolge (für die Verwaltung). */
export function useAlleLifts() {
  return useQuery({
    queryKey: [BEREICH, 'alle'],
    queryFn: async ({ signal }) =>
      datenOderFehler(await api.GET('/api/lifts', { params: { query: { inklusiveInaktive: true } }, signal })),
  })
}

/** Anlegen (ohne `id`) oder Umbenennen (mit `id` und geladener `version`). */
export function useLiftSpeichern() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, version }: { id?: string; name: string; version?: number }) =>
      id
        ? datenOderFehler(await api.PUT('/api/lifts/{id}', { params: { path: { id } }, body: { name, version } }))
        : datenOderFehler(await api.POST('/api/lifts', { body: { name } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}

/** Stilllegen oder wieder in Betrieb nehmen. */
export function useLiftAktivSetzen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, aktiv }: { id: string; aktiv: boolean }) =>
      aktiv
        ? datenOderFehler(await api.POST('/api/lifts/{id}/aktivieren', { params: { path: { id } } }))
        : datenOderFehler(await api.POST('/api/lifts/{id}/deaktivieren', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}

/** Neue Reihenfolge: erste ID = ganz links (Spalten in Tagesansicht und Dashboard). */
export function useLiftReihenfolge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => datenOderFehler(await api.PUT('/api/lifts/reihenfolge', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}
