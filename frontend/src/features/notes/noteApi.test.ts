import { describe, expect, it } from 'vitest'
import { ApiError, serverUnreachable } from '../../api/errors'
import { isGone } from './noteApi'

describe('isGone', () => {
  it('closes when the note was deleted elsewhere', () => {
    expect(isGone(new ApiError({ status: 404, title: 'Nicht gefunden' }), true)).toBe(true)
  })

  it('stays open with the unsaved text when only a refetch fails', () => {
    expect(isGone(new ApiError(serverUnreachable()), true)).toBe(false)
    expect(isGone(new ApiError({ status: 500, title: 'Unerwarteter Fehler' }), true)).toBe(false)
  })

  it('closes when the note could not be loaded at all', () => {
    expect(isGone(new ApiError(serverUnreachable()), false)).toBe(true)
    expect(isGone(null, false)).toBe(false)
  })
})
