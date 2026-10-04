import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastApi {
  success: (text: string) => void
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
