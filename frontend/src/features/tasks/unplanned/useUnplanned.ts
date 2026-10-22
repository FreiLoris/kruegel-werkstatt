import { useMemo } from 'react'
import { useToday } from '../../../lib/clock'
import { useTasksWaitingForParts, useTasksWithoutAppointment } from '../taskApi'
import { unplannedGroups, type UnplannedGroups } from './unplannedGroups'

/** "Ohne Termin" with its two groups (FB-15) – undefined while loading */
export function useUnplanned(): { data: UnplannedGroups | undefined; error: Error | null } {
  const without = useTasksWithoutAppointment()
  const waiting = useTasksWaitingForParts(useToday())
  const data = useMemo(
    () => (without.data && waiting.data ? unplannedGroups(without.data, waiting.data) : undefined),
    [without.data, waiting.data],
  )
  return { data, error: without.error ?? waiting.error }
}
