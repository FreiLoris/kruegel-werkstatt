/**
 * Zugriff auf den Health-Endpoint des Backends (Spring Boot Actuator).
 * Wir typisieren nur die Felder, die wir tatsächlich verwenden.
 */

export type HealthStatus = 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | 'UNKNOWN'

export interface HealthResponse {
  status: HealthStatus
  components?: {
    db?: { status: HealthStatus }
  }
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal })

  // Actuator antwortet bei Problemen mit HTTP 503, liefert aber trotzdem
  // ein JSON mit Details. Darum werten wir den Body auch dann aus.
  if (!response.ok && response.status !== 503) {
    throw new Error(`Keine gültige Antwort vom Backend (HTTP ${response.status})`)
  }

  return (await response.json()) as HealthResponse
}
