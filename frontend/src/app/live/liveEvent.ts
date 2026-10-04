import type { QueryClient } from '@tanstack/react-query'
import type { components } from '../../api/schema'

export type DataChanged = components['schemas']['DataChanged']

/**
 * Reaction to a change message from the server: reload all queries of that topic.
 *
 * Convention: the first part of every query key is the topic, e.g.
 * `['employees']` or `['employees', id]`. A message `{ topic: 'employees' }`
 * therefore reloads all employee data currently shown.
 */
export function onDataChanged(data: string, queryClient: QueryClient): void {
  let event: DataChanged
  try {
    event = JSON.parse(data) as DataChanged
  } catch {
    console.warn('Ignored unreadable live event:', data)
    return
  }
  void queryClient.invalidateQueries({ queryKey: [event.topic] })
}
