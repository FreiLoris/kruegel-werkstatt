import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  text: string
  /** Label of the confirm button, e.g. "Löschen" (default: "Bestätigen") */
  confirmLabel?: string
  /** Red button – for actions that cannot be undone */
  dangerous?: boolean
}

export type Confirm = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<Confirm | null>(null)

/**
 * Asks before something important happens. Replaces the ugly `window.confirm()`.
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title: 'Auftrag löschen?', text: '…', dangerous: true })) {
 *     remove()
 *   }
 */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error('useConfirm() needs a <ConfirmProvider> further up the tree')
  }
  return confirm
}
