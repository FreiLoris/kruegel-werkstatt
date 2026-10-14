import type { AnyTask } from '../taskApi'

/**
 * The open tasks of a vehicle among `tasks` (FB-01): the same car taken twice by mistake – in the
 * live app two tasks a few seconds apart, on different lifts. Done tasks do not count (the car may
 * well come again the same day), the task being edited neither. Without a vehicle there is nothing
 * to compare: "Fahrzeug noch offen" says nothing about which car it is.
 */
export function openTasksOfVehicle(tasks: readonly AnyTask[], vehicleId: string | undefined, exceptTaskId?: string): AnyTask[] {
  if (!vehicleId) return []
  return tasks.filter((task) => task.vehicle?.id === vehicleId && task.id !== exceptTaskId && task.status !== 'DONE')
}
