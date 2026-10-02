/**
 * Fehler aus der Backend-API.
 *
 * Das Backend antwortet bei jedem Fehler im Format "Problem Details" (RFC 9457),
 * siehe GlobalExceptionHandler im Backend. Der Typ ist hier von Hand beschrieben,
 * weil er (noch) nicht im generierten Vertrag vorkommt – sobald Endpoints existieren,
 * nimmt springdoc ihn auf.
 */

export interface Feldfehler {
  feld: string
  meldung: string
}

export interface ProblemDetail {
  status: number
  title?: string
  detail?: string
  fehler?: Feldfehler[]
}

export class ApiFehler extends Error {
  readonly problem: ProblemDetail

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Fehler ${problem.status}`)
    this.name = 'ApiFehler'
    this.problem = problem
  }

  /** Meldung zu einem bestimmten Eingabefeld (für die Anzeige im Formular). */
  meldungFuerFeld(feld: string): string | undefined {
    return this.problem.fehler?.find((f) => f.feld === feld)?.meldung
  }

  get istKonflikt(): boolean {
    return this.problem.status === 409
  }
}

/**
 * Packt das Ergebnis eines API-Aufrufs (`api.GET(...)` usw.) aus:
 * liefert die Daten oder wirft einen {@link ApiFehler}.
 *
 * So können TanStack-Query-Funktionen einfach `return datenOderFehler(await api.GET(...))`
 * schreiben – Fehler landen automatisch im `error` der Query.
 */
export function datenOderFehler<T>(ergebnis: { data?: T; error?: unknown; response: Response }): T {
  if (ergebnis.error !== undefined || !ergebnis.response.ok) {
    throw new ApiFehler(alsProblemDetail(ergebnis.error, ergebnis.response.status))
  }
  return ergebnis.data as T
}

function alsProblemDetail(body: unknown, status: number): ProblemDetail {
  if (typeof body === 'object' && body !== null && 'status' in body) {
    return body as ProblemDetail
  }
  // Keine Problem-Details-Antwort, z. B. wenn das Backend gar nicht erreichbar ist (502 von nginx/Vite)
  return { status, title: 'Server nicht erreichbar', detail: 'Keine gültige Antwort vom Server.' }
}
