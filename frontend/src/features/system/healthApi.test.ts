import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { fetchHealth } from './healthApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchHealth', () => {
  it('reads the details of a 503 – the database is down, the backend is not', async () => {
    const body = { status: 'DOWN', components: { db: { status: 'DOWN' } } }
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify(body), { status: 503 })))

    await expect(fetchHealth()).resolves.toEqual(body)
  })

  it('reports a network failure in German', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))

    const error = await fetchHealth().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Keine gültige Antwort vom Server.')
  })

  it('lets a cancelled request through as it is', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new DOMException('aborted', 'AbortError')))

    await expect(fetchHealth()).rejects.toBeInstanceOf(DOMException)
  })
})
