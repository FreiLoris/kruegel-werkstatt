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
  /** "urn:problem:version-conflict" for a version conflict, see {@link ApiError.isVersionConflict} */
  type?: string
  status: number
  title?: string
  detail?: string
  errors?: FieldError[]
}

const VERSION_CONFLICT = 'urn:problem:version-conflict'

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

  /** Any 409: a version conflict or a business rule (e.g. "Lift 2 wurde gerade belegt") */
  get isConflict(): boolean {
    return this.problem.status === 409
  }

  /** Someone else changed the record meanwhile – it has to be loaded again (not a business rule) */
  get isVersionConflict(): boolean {
    return this.isConflict && this.problem.type === VERSION_CONFLICT
  }
}

/**
 * The reason in words for a toast: the first field message ("Lift 1 ist von … belegt") says more
 * than the general "Bitte die markierten Felder korrigieren." – a drag has no fields to mark.
 */
export function reasonOf(error: Error): string {
  return (error instanceof ApiError && error.problem.errors?.[0]?.message) || error.message
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
  return serverUnreachable(status)
}

/**
 * The server could not be reached or gave no usable answer. User-facing text, hence German.
 * `status` 0: the request did not get through at all (network down, e.g. tablet out of Wi-Fi).
 */
export function serverUnreachable(status = 0): ProblemDetail {
  return { status, title: 'Server nicht erreichbar', detail: 'Keine gültige Antwort vom Server.' }
}
