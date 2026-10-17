import { describe, expect, it } from 'vitest'
import { ApiError, serverUnreachable } from '../api/errors'
import { shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it('tries once more when the server could not be reached (Wi-Fi gap)', () => {
    expect(shouldRetry(0, new ApiError(serverUnreachable()))).toBe(true)
    expect(shouldRetry(0, new ApiError({ status: 502, title: 'Server nicht erreichbar' }))).toBe(true)
  })

  it('does not ask again when the server said no', () => {
    expect(shouldRetry(0, new ApiError({ status: 404, title: 'Nicht gefunden' }))).toBe(false)
    expect(shouldRetry(0, new ApiError({ status: 403, title: 'Keine Person gewählt' }))).toBe(false)
  })

  it('only once', () => {
    expect(shouldRetry(1, new ApiError(serverUnreachable()))).toBe(false)
  })
})
