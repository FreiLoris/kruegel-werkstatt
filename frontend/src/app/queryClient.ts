import { MutationCache, QueryClient } from '@tanstack/react-query'
import { ApiFehler } from '../api/fehler'
import { wahlZuruecksetzen } from '../lib/geraetPerson'

/**
 * Zentrale Verwaltung aller Datenabfragen (TanStack Query).
 *
 * TanStack Query übernimmt Laden, Zwischenspeichern und Neuladen von Server-Daten.
 * Komponenten fragen nur noch `useQuery(...)` – kein eigenes useEffect/useState-Gebastel.
 */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (fehler) => {
      // 403 = Backend kennt die Person dieses Geräts nicht (mehr) → neu wählen lassen
      if (fehler instanceof ApiFehler && fehler.problem.status === 403) {
        wahlZuruecksetzen()
      }
    },
  }),
  defaultOptions: {
    queries: {
      // Daten gelten 30 s als frisch. Änderungen anderer Geräte kommen später
      // zusätzlich sofort per Live-Update (Paket 2g).
      staleTime: 30_000,
      // Ein Fehlversuch wird einmal wiederholt (z. B. kurzer WLAN-Aussetzer).
      retry: 1,
    },
  },
})
