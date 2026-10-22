import { useMemo } from 'react'
import { useToday } from '../../../lib/clock'
import { useTasksShoppingItems } from '../../shopping/shoppingApi'
import { useTasksWaitingForParts, useTasksWithoutAppointment } from '../taskApi'
import { partsByTask, unplannedGroups, type TaskParts, type UnplannedGroups } from './unplannedGroups'

/**
 * "Ohne Termin" with its two groups (FB-15) and what each task is missing (FB-19) – undefined while
 * loading: the parts are there before the list shows, so it does not jump.
 */
export function useUnplanned(): { data: UnplannedGroups | undefined; parts: Map<string, TaskParts>; error: Error | null } {
  const without = useTasksWithoutAppointment()
  const waiting = useTasksWaitingForParts(useToday())
  // the parts of exactly these tasks – all of them, arrived ones too
  const taskIds = useMemo(() => [...(without.data ?? []), ...(waiting.data ?? [])].map((t) => t.id), [without.data, waiting.data])
  const items = useTasksShoppingItems(taskIds)
  const parts = useMemo(() => partsByTask(items.data ?? []), [items.data])
  const data = useMemo(
    () => (without.data && waiting.data && items.data ? unplannedGroups(without.data, waiting.data, parts) : undefined),
    [without.data, waiting.data, items.data, parts],
  )
  return { data, parts, error: without.error ?? waiting.error ?? items.error }
}
