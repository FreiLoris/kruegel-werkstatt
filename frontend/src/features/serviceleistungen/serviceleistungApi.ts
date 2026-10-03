import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { datenOderFehler } from '../../api/fehler'
import type { components } from '../../api/schema'

export type Serviceleistung = components['schemas']['ServiceleistungDto']

/** Bereich für Query-Keys und Live-Updates – derselbe Text wie im Backend. */
const BEREICH = 'serviceleistungen'

/** Alle Serviceleistungen inkl. nicht mehr angebotene, in fester Reihenfolge (für die Verwaltung). */
export function useAlleServiceleistungen() {
  return useQuery({
    queryKey: [BEREICH, 'alle'],
    queryFn: async ({ signal }) =>
      datenOderFehler(await api.GET('/api/serviceleistungen', { params: { query: { inklusiveInaktive: true } }, signal })),
  })
}

/** Anlegen (ohne `id`) oder Umbenennen (mit `id` und geladener `version`). */
export function useServiceleistungSpeichern() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, version }: { id?: string; name: string; version?: number }) =>
      id
        ? datenOderFehler(await api.PUT('/api/serviceleistungen/{id}', { params: { path: { id } }, body: { name, version } }))
        : datenOderFehler(await api.POST('/api/serviceleistungen', { body: { name } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}

/** Nicht mehr anbieten oder wieder anbieten. */
export function useServiceleistungAktivSetzen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, aktiv }: { id: string; aktiv: boolean }) =>
      aktiv
        ? datenOderFehler(await api.POST('/api/serviceleistungen/{id}/aktivieren', { params: { path: { id } } }))
        : datenOderFehler(await api.POST('/api/serviceleistungen/{id}/deaktivieren', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}

/** Neue Reihenfolge: erste ID = ganz oben (Checkboxen im Auftrag, Auftragszettel). */
export function useServiceleistungReihenfolge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => datenOderFehler(await api.PUT('/api/serviceleistungen/reihenfolge', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}
