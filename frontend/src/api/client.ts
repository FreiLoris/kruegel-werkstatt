import createClient from 'openapi-fetch'
import { personIdForRequests } from '../lib/devicePerson'
import type { paths } from './schema'

/**
 * Typed access to the backend API.
 *
 * All paths, parameters and responses come from `schema.d.ts`, which is generated from the
 * backend's OpenAPI description. If the API changes, TypeScript reports every place in the
 * frontend that no longer fits.
 *
 *   const { data, error } = await api.GET('/api/employees')
 *
 * No baseUrl needed: calls go relative to the same server
 * (locally Vite forwards /api, in production nginx does).
 */
export const api = createClient<paths>()

// Every request carries the selected person (see lib/devicePerson.ts) –
// so the backend stores "changed by" and rejects changes without a person.
api.use({
  onRequest({ request }) {
    const person = personIdForRequests()
    if (person) request.headers.set('X-Person', person)
    return request
  },
})
