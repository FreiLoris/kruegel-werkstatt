import type { QueryClient } from '@tanstack/react-query'
import type { components } from '../../api/schema'
import { SEASON_CHANGE_KEY } from '../../features/tire-hotel/tireSeasonApi'

export type DataChanged = components['schemas']['DataChanged']

/**
 * Reaction to a change message from the server: reload all queries of that topic.
 *
 * Convention: the first part of every query key is the topic, e.g.
 * `['employees']` or `['employees', id]`. A message `{ topic: 'employees' }`
 * therefore reloads all employee data currently shown.
 *
 * A few views are made of more than their topic – they are reloaded with the other one too.
 */
const ALSO: Partial<Record<string, readonly (readonly string[])[]>> = {
  // "Termin geplant" of the season change (FB-21)
  tasks: [SEASON_CHANGE_KEY],
  // vacation days are working days: the statistics count without the holidays (neutral 2)
  'public-holidays': [['absences']],
}

export function onDataChanged(data: string, queryClient: QueryClient): void {
  let event: DataChanged
  try {
    event = JSON.parse(data) as DataChanged
  } catch {
    console.warn('Ignored unreadable live event:', data)
    return
  }
  void queryClient.invalidateQueries({ queryKey: [event.topic] })
  for (const key of ALSO[event.topic] ?? []) void queryClient.invalidateQueries({ queryKey: key })
}
