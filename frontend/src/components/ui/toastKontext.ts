import { createContext, useContext } from 'react'

export type ToastArt = 'erfolg' | 'fehler' | 'info'

export interface ToastApi {
  erfolg: (text: string) => void
  fehler: (text: string) => void
  info: (text: string) => void
}

export const ToastKontext = createContext<ToastApi | null>(null)

/**
 * Kurze Rückmeldung oben rechts, verschwindet von selbst.
 *
 *   const toast = useToast()
 *   toast.erfolg('Mitarbeiter gespeichert')
 */
export function useToast(): ToastApi {
  const api = useContext(ToastKontext)
  if (!api) {
    throw new Error('useToast() braucht einen <ToastProvider> weiter oben im Baum')
  }
  return api
}
