import { useSyncExternalStore } from 'react'

/**
 * What a device does after some minutes without use (FB-29, decided by the workshop 2026-10-28) –
 * set per device, stored in the browser like the person:
 * - lock: asks "Wer ist am Gerät?" (office PCs, the default)
 * - viewOnly: falls back to "Nur ansehen" silently – the shared workshop tablet: anyone switches to
 *   themselves to edit, and nobody stays signed in by mistake
 * - never: stays as it is
 * A device on "Nur ansehen" (the TV, the tablet at rest) is never locked anyway.
 */
export type IdleMode = 'lock' | 'viewOnly' | 'never'

export const IDLE_MODES: Record<IdleMode, string> = {
  lock: 'Sperren – fragen, wer am Gerät ist (Büro)',
  viewOnly: 'Still zurück auf «Nur ansehen» (Werkstatt-Tablet)',
  never: 'Nie',
}

const STORAGE_KEY = 'workshop.idleMode'
const listeners = new Set<() => void>()

export const isIdleMode = (value: string | null): value is IdleMode => value !== null && Object.hasOwn(IDLE_MODES, value)

export function idleMode(): IdleMode {
  const text = read()
  return isIdleMode(text) ? text : 'lock'
}

export function setIdleMode(mode: IdleMode): void {
  try {
    if (mode === 'lock') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // private window: back to the default on the next load
  }
  listeners.forEach((listener) => listener())
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', fromOtherTab)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', fromOtherTab)
  }
}

/** The mode of this device – follows a change in the settings and in other tabs */
export function useIdleMode(): IdleMode {
  return useSyncExternalStore(subscribe, idleMode)
}

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
