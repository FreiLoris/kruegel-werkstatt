import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLiveUpdates } from './useLiveUpdates'

/** Nachbildung von EventSource (gibt es in jsdom nicht) – Tests lösen Ereignisse selbst aus. */
class FakeEventSource extends EventTarget {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instanzen: FakeEventSource[] = []

  readyState = FakeEventSource.CONNECTING
  readonly url: string

  constructor(url: string) {
    super()
    this.url = url
    FakeEventSource.instanzen.push(this)
  }

  verbunden() {
    this.readyState = FakeEventSource.OPEN
    this.dispatchEvent(new Event('verbunden'))
  }

  /** Server antwortet mit Fehler (z. B. 502) → Browser gibt endgültig auf */
  endgueltigerFehler() {
    this.readyState = FakeEventSource.CLOSED
    this.dispatchEvent(new Event('error'))
  }

  close() {
    this.readyState = FakeEventSource.CLOSED
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe('useLiveUpdates', () => {
  beforeEach(() => {
    FakeEventSource.instanzen = []
    vi.stubGlobal('EventSource', FakeEventSource)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('meldet "verbunden", sobald der Server antwortet', () => {
    const { result } = renderHook(() => useLiveUpdates(), { wrapper })
    expect(result.current).toBe('verbinde')

    act(() => FakeEventSource.instanzen[0].verbunden())

    expect(result.current).toBe('verbunden')
  })

  it('verbindet nach endgültigem Fehler selbst neu – mit wachsender Wartezeit', () => {
    const { result } = renderHook(() => useLiveUpdates(), { wrapper })

    act(() => FakeEventSource.instanzen[0].endgueltigerFehler())
    expect(result.current).toBe('getrennt')
    expect(FakeEventSource.instanzen).toHaveLength(1)

    act(() => vi.advanceTimersByTime(1_000)) // 1. Versuch nach 1 s
    expect(FakeEventSource.instanzen).toHaveLength(2)

    act(() => FakeEventSource.instanzen[1].endgueltigerFehler())
    act(() => vi.advanceTimersByTime(1_000)) // 2. Versuch erst nach 2 s
    expect(FakeEventSource.instanzen).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1_000))
    expect(FakeEventSource.instanzen).toHaveLength(3)

    act(() => FakeEventSource.instanzen[2].verbunden())
    expect(result.current).toBe('verbunden')
  })

  it('verbindet nach dem Verlassen nicht mehr neu', () => {
    const { unmount } = renderHook(() => useLiveUpdates(), { wrapper })

    act(() => FakeEventSource.instanzen[0].endgueltigerFehler())
    unmount()
    act(() => vi.advanceTimersByTime(60_000))

    expect(FakeEventSource.instanzen).toHaveLength(1)
  })
})
