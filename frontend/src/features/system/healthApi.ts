/**
 * Access to the backend's health endpoint (Spring Boot Actuator).
 * We only type the fields we actually use.
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

  // Actuator answers problems with HTTP 503 but still delivers JSON with details.
  // That is why we read the body in that case too.
  if (!response.ok && response.status !== 503) {
    throw new Error(`Keine gültige Antwort vom Backend (HTTP ${response.status})`)
  }

  return (await response.json()) as HealthResponse
}
