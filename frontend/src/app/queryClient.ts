import { QueryClient } from '@tanstack/react-query'

/**
 * Zentrale Verwaltung aller Datenabfragen (TanStack Query).
 *
 * TanStack Query übernimmt Laden, Zwischenspeichern und Neuladen von Server-Daten.
 * Komponenten fragen nur noch `useQuery(...)` – kein eigenes useEffect/useState-Gebastel.
 */
export const queryClient = new QueryClient({
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
