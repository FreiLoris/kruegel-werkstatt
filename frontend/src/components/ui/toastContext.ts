import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

/** A button in the message, e.g. "Rückgängig" (UX G-13) – pressing it closes the message */
export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastApi {
  /** @param action e.g. "Rückgängig" – the message then stays longer, there is time to press it */
  success: (text: string, action?: ToastAction) => void
  error: (text: string) => void
  info: (text: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/**
 * Short feedback at the top right, disappears on its own.
 *
 *   const toast = useToast()
 *   toast.success('Mitarbeiter gespeichert')
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) {
    throw new Error('useToast() needs a <ToastProvider> further up the tree')
  }
  return api
}
