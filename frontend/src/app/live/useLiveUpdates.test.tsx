import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLiveUpdates } from './useLiveUpdates'

/** Imitation of EventSource (jsdom has none) – tests fire the events themselves. */
class FakeEventSource extends EventTarget {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: FakeEventSource[] = []

  readyState = FakeEventSource.CONNECTING
  readonly url: string

  constructor(url: string) {
    super()
    this.url = url
    FakeEventSource.instances.push(this)
  }

  connected() {
    this.readyState = FakeEventSource.OPEN
    this.dispatchEvent(new Event('connected'))
  }

  /** Server answers with an error (e.g. 502) → the browser gives up for good */
  fatalError() {
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
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reports "connected" as soon as the server answers', () => {
    const { result } = renderHook(() => useLiveUpdates(), { wrapper })
    expect(result.current).toBe('connecting')

    act(() => FakeEventSource.instances[0].connected())

    expect(result.current).toBe('connected')
  })

  it('reconnects on its own after a fatal error – with a growing delay', () => {
    const { result } = renderHook(() => useLiveUpdates(), { wrapper })

    act(() => FakeEventSource.instances[0].fatalError())
    expect(result.current).toBe('disconnected')
    expect(FakeEventSource.instances).toHaveLength(1)

    act(() => vi.advanceTimersByTime(1_000)) // 1st attempt after 1 s
    expect(FakeEventSource.instances).toHaveLength(2)

    act(() => FakeEventSource.instances[1].fatalError())
    act(() => vi.advanceTimersByTime(1_000)) // 2nd attempt only after 2 s
    expect(FakeEventSource.instances).toHaveLength(2)
    act(() => vi.advanceTimersByTime(1_000))
    expect(FakeEventSource.instances).toHaveLength(3)

    act(() => FakeEventSource.instances[2].connected())
    expect(result.current).toBe('connected')
  })

  it('does not reconnect after unmounting', () => {
    const { unmount } = renderHook(() => useLiveUpdates(), { wrapper })

    act(() => FakeEventSource.instances[0].fatalError())
    unmount()
    act(() => vi.advanceTimersByTime(60_000))

    expect(FakeEventSource.instances).toHaveLength(1)
  })
})
