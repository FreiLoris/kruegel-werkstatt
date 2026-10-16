import { describe, expect, it } from 'vitest'
import { api } from './client'
import { ApiError } from './errors'

describe('api client', () => {
  it('turns a network failure into a German ApiError', async () => {
    const offline = () => Promise.reject(new TypeError('Failed to fetch'))

    const error = await api.GET('/api/employees', { baseUrl: 'http://werkstatt.test', fetch: offline }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).problem).toMatchObject({ status: 0, title: 'Server nicht erreichbar' })
  })

  it('lets a cancelled request through as it is', async () => {
    const aborted = () => Promise.reject(new DOMException('aborted', 'AbortError'))

    const error = await api.GET('/api/employees', { baseUrl: 'http://werkstatt.test', fetch: aborted }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(DOMException)
  })
})
