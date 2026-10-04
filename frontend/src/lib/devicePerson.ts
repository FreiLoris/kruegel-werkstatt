/**
 * "Who uses this device?" – chosen once, stored in the browser (localStorage).
 *
 * No login: every device picks a person or "view only" (workshop TV). The selected person
 * goes to the backend as header `X-Person` with every request (see `api/client.ts`),
 * which stores "changed by" with it and rejects changes without a person.
 *
 * Without React on purpose: the API client needs the value too. Components read it through
 * `useDevicePerson()`, which subscribes here and re-renders on changes.
 */

export type DeviceChoice = { kind: 'person'; id: string } | { kind: 'viewOnly' }

const STORAGE_KEY = 'workshop.devicePerson'

const listeners = new Set<() => void>()

// Cache: same stored string → same object.
// React (useSyncExternalStore) detects changes by object identity – a new object on every
// read would re-render endlessly.
let lastText: string | null = null
let lastChoice: DeviceChoice | null = null

/** Current choice of this device, `null` = nothing chosen yet. */
export function deviceChoice(): DeviceChoice | null {
  const text = readStorage()
  if (text !== lastText) {
    lastText = text
    lastChoice = parse(text)
  }
  return lastChoice
}

export function choose(choice: DeviceChoice): void {
  writeStorage(JSON.stringify(choice))
  notify()
}

/** Forget the choice → the device asks "Who are you?" again on the next render. */
export function resetChoice(): void {
  writeStorage(null)
  notify()
}

/** For the header `X-Person` – only if a person (not "view only") is chosen. */
export function personIdForRequests(): string | undefined {
  const choice = deviceChoice()
  return choice?.kind === 'person' ? choice.id : undefined
}

/** Notify on changes – also when the choice is made in another tab of the same browser. */
export function subscribe(onChange: () => void): () => void {
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

function notify() {
  listeners.forEach((listener) => listener())
}

function parse(text: string | null): DeviceChoice | null {
  if (!text) return null
  try {
    const value = JSON.parse(text) as Partial<{ kind: string; id: string }>
    if (value.kind === 'viewOnly') return { kind: 'viewOnly' }
    if (value.kind === 'person' && typeof value.id === 'string') return { kind: 'person', id: value.id }
  } catch {
    // broken entry → treat as nothing chosen
  }
  return null
}

// localStorage can be missing or blocked (private window, strict settings).
// Then the device simply asks again on every load – the app still works.
function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorage(text: string | null) {
  try {
    if (text === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, text)
  } catch {
    // see above
  }
}
