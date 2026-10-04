import { describe, expect, it } from 'vitest'
import { ApiError, dataOrThrow } from './errors'

function response(status: number): Response {
  return new Response(null, { status })
}

/** Runs the function and returns the ApiError it throws. */
function catchApiError(fn: () => unknown): ApiError {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError)
    return e as ApiError
  }
  throw new Error('No error was thrown')
}

describe('dataOrThrow', () => {
  it('returns the data on success', () => {
    const data = dataOrThrow({ data: { name: 'Reto' }, response: response(200) })
    expect(data).toEqual({ name: 'Reto' })
  })

  it('throws ApiError with the backend Problem Details', () => {
    const problem = {
      status: 400,
      title: 'Ungültige Eingabe',
      detail: 'Bitte die markierten Felder korrigieren.',
      errors: [{ field: 'name', message: 'darf nicht leer sein' }],
    }

    const error = catchApiError(() => dataOrThrow({ error: problem, response: response(400) }))

    expect(error.message).toBe('Bitte die markierten Felder korrigieren.')
    expect(error.messageForField('name')).toBe('darf nicht leer sein')
    expect(error.messageForField('firstName')).toBeUndefined()
    expect(error.isConflict).toBe(false)
  })

  it('recognises conflicts (409)', () => {
    const error = catchApiError(() => dataOrThrow({ error: { status: 409 }, response: response(409) }))

    expect(error.isConflict).toBe(true)
  })

  it('returns an understandable message when the server does not answer', () => {
    const error = catchApiError(() => dataOrThrow({ error: 'Bad Gateway', response: response(502) }))

    expect(error.message).toBe('Keine gültige Antwort vom Server.')
    expect(error.problem.status).toBe(502)
  })
})
