/**
 * Errors from the backend API.
 *
 * The backend answers every error in the "Problem Details" format (RFC 9457), see
 * GlobalExceptionHandler in the backend. The type is written by hand on purpose: the generated
 * `ProblemDetail` in the contract describes Spring's internal class (extra fields as
 * `properties`), not the actual JSON with our field `errors`.
 */

export interface FieldError {
  field: string
  message: string
}

export interface ProblemDetail {
  status: number
  title?: string
  detail?: string
  errors?: FieldError[]
}

export class ApiError extends Error {
  readonly problem: ProblemDetail

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Fehler ${problem.status}`)
    this.name = 'ApiError'
    this.problem = problem
  }

  /** Message for a specific input field (to show it in the form). */
  messageForField(field: string): string | undefined {
    return this.problem.errors?.find((e) => e.field === field)?.message
  }

  get isConflict(): boolean {
    return this.problem.status === 409
  }
}

/**
 * Unwraps the result of an API call (`api.GET(...)` etc.):
 * returns the data or throws an {@link ApiError}.
 *
 * That way TanStack Query functions can simply write `return dataOrThrow(await api.GET(...))` –
 * errors end up in the query's `error` automatically.
 */
export function dataOrThrow<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    throw new ApiError(asProblemDetail(result.error, result.response.status))
  }
  return result.data as T
}

function asProblemDetail(body: unknown, status: number): ProblemDetail {
  if (typeof body === 'object' && body !== null && 'status' in body) {
    return body as ProblemDetail
  }
  // No Problem Details response, e.g. when the backend is not reachable at all (502 from nginx/Vite).
  // User-facing text, hence German.
  return { status, title: 'Server nicht erreichbar', detail: 'Keine gültige Antwort vom Server.' }
}
