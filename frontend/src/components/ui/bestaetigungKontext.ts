import { createContext, useContext } from 'react'

export interface BestaetigungOptionen {
  titel: string
  text: string
  /** Beschriftung des Bestätigen-Buttons, z. B. "Löschen" (Standard: "Bestätigen") */
  bestaetigenText?: string
  /** Roter Button – für Aktionen, die man nicht rückgängig machen kann */
  gefaehrlich?: boolean
}

export type Bestaetige = (optionen: BestaetigungOptionen) => Promise<boolean>

export const BestaetigungKontext = createContext<Bestaetige | null>(null)

/**
 * Fragt nach, bevor etwas Wichtiges passiert. Ersetzt das unschöne `window.confirm()`.
 *
 *   const bestaetige = useBestaetigung()
 *   if (await bestaetige({ titel: 'Auftrag löschen?', text: '…', gefaehrlich: true })) {
 *     loeschen()
 *   }
 */
export function useBestaetigung(): Bestaetige {
  const bestaetige = useContext(BestaetigungKontext)
  if (!bestaetige) {
    throw new Error('useBestaetigung() braucht einen <BestaetigungProvider> weiter oben im Baum')
  }
  return bestaetige
}
