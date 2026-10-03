import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { datenOderFehler } from '../../api/fehler'
import type { components } from '../../api/schema'

export type Mitarbeiter = components['schemas']['MitarbeiterDto']
export type MitarbeiterEingabe = components['schemas']['MitarbeiterEingabe']
export type Rolle = Mitarbeiter['rolle']

/** Anzeigenamen der Rollen, in der Reihenfolge für Auswahlfelder. */
export const ROLLEN: Record<Rolle, string> = {
  GESCHAEFTSFUEHRUNG: 'Geschäftsführung',
  MECHANIKER: 'Mechaniker',
  BUERO: 'Büro',
  LERNENDER: 'Lernender',
  PRAKTIKUM: 'Praktikum',
}

/** Bereich für Query-Keys und Live-Updates – derselbe Text wie im Backend. */
const BEREICH = 'mitarbeiter'

/** Alle Mitarbeiter inkl. Ehemalige, in fester Reihenfolge (für die Verwaltung). */
export function useAlleMitarbeiter() {
  return useQuery({
    queryKey: [BEREICH, 'alle'],
    queryFn: async ({ signal }) =>
      datenOderFehler(await api.GET('/api/mitarbeiter', { params: { query: { inklusiveInaktive: true } }, signal })),
  })
}

/**
 * Anlegen (ohne `id`) oder Bearbeiten (mit `id`, Eingabe enthält dann die geladene `version`).
 *
 * Nach dem Speichern wird die Liste neu geladen. Das Live-Update würde das auch tun,
 * aber so sieht das eigene Gerät die Änderung auch dann sofort, wenn die Live-Verbindung
 * gerade unterbrochen ist.
 */
export function useMitarbeiterSpeichern() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, eingabe }: { id?: string; eingabe: MitarbeiterEingabe }) =>
      id
        ? datenOderFehler(await api.PUT('/api/mitarbeiter/{id}', { params: { path: { id } }, body: eingabe }))
        : datenOderFehler(await api.POST('/api/mitarbeiter', { body: eingabe })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}

/** Deaktivieren (Person hat den Betrieb verlassen) oder wieder aktivieren. */
export function useMitarbeiterAktivSetzen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, aktiv }: { id: string; aktiv: boolean }) =>
      aktiv
        ? datenOderFehler(await api.POST('/api/mitarbeiter/{id}/aktivieren', { params: { path: { id } } }))
        : datenOderFehler(await api.POST('/api/mitarbeiter/{id}/deaktivieren', { params: { path: { id } } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}

/** Neue Reihenfolge speichern: erste ID = ganz vorne (Pinnwand-Spalten, Auswahllisten). */
export function useMitarbeiterReihenfolge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => datenOderFehler(await api.PUT('/api/mitarbeiter/reihenfolge', { body: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BEREICH] }),
  })
}
