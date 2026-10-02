import createClient from 'openapi-fetch'
import type { paths } from './schema'

/**
 * Typisierter Zugriff auf die Backend-API.
 *
 * Alle Pfade, Parameter und Antworten kommen aus `schema.d.ts`, das aus der
 * OpenAPI-Beschreibung des Backends generiert wird. Ändert sich die API, meldet
 * TypeScript jede Stelle im Frontend, die nicht mehr passt.
 *
 * Beispiel (sobald es den Endpoint gibt):
 *   const { data, error } = await api.GET('/api/mitarbeiter')
 *
 * Kein baseUrl nötig: Aufrufe gehen relativ an denselben Server
 * (lokal leitet Vite /api weiter, im Betrieb nginx).
 */
export const api = createClient<paths>()
