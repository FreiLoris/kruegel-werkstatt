import { createBrowserRouter } from 'react-router'
import { SystemSeite } from '../features/health/SystemSeite'
import { StartSeite } from '../features/start/StartSeite'
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
      { path: 'system', element: <SystemSeite /> },
      { path: '*', element: <NichtGefundenSeite /> },
    ],
  },
])
