import { createBrowserRouter } from 'react-router'
import { MitarbeiterSeite } from '../features/mitarbeiter/MitarbeiterSeite'
import { StartSeite } from '../features/start/StartSeite'
import { KomponentenSeite } from '../features/system/KomponentenSeite'
import { SystemSeite } from '../features/system/SystemSeite'
import { AppLayout } from './AppLayout'
import { AbsturzSeite, NichtGefundenSeite } from './FehlerSeiten'

/**
 * Alle Seiten der App mit ihrer URL.
 * Jede Seite hat eine eigene Adresse → Browser-Zurück funktioniert, Links sind teilbar,
 * ein Tablet kann direkt eine bestimmte Seite als Startseite haben.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <AbsturzSeite />,
    children: [
      { index: true, element: <StartSeite /> },
      { path: 'mitarbeiter', element: <MitarbeiterSeite /> },
      { path: 'system', element: <SystemSeite /> },
      { path: 'system/komponenten', element: <KomponentenSeite /> },
      { path: '*', element: <NichtGefundenSeite /> },
    ],
  },
])
