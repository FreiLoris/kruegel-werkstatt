import type { QueryClient } from '@tanstack/react-query'
import type { components } from '../../api/schema'

export type DatenGeaendert = components['schemas']['DatenGeaendert']

/**
 * Reaktion auf eine Änderungsmeldung vom Server: alle Abfragen dieses Bereichs neu laden.
 *
 * Konvention: Der erste Teil jedes Query-Keys ist der Bereich, z. B.
 * `['mitarbeiter']` oder `['mitarbeiter', id]`. Eine Meldung `{ bereich: 'mitarbeiter' }`
 * lädt damit alle Mitarbeiter-Daten neu, die gerade angezeigt werden.
 */
export function beiAenderung(daten: string, queryClient: QueryClient): void {
  let ereignis: DatenGeaendert
  try {
    ereignis = JSON.parse(daten) as DatenGeaendert
  } catch {
    console.warn('Unlesbares Live-Ereignis ignoriert:', daten)
    return
  }
  void queryClient.invalidateQueries({ queryKey: [ereignis.bereich] })
}
