import { describe, expect, it } from 'vitest'
import type { AnyTask } from '../taskApi'
import { openTasksOfVehicle } from './sameVehicle'

// fictitious
const task = (id: string, vehicleId: string | null, status: AnyTask['status'] = 'RECEIVED') =>
  ({ id, vehicle: vehicleId ? { id: vehicleId } : null, status }) as unknown as AnyTask

describe('openTasksOfVehicle', () => {
  it('finds the other open tasks of the same vehicle', () => {
    const tasks = [task('a', 'golf'), task('b', 'polo'), task('c', 'golf', 'IN_PROGRESS'), task('d', null)]

    expect(openTasksOfVehicle(tasks, 'golf').map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('leaves out done tasks and the task being edited', () => {
    const tasks = [task('a', 'golf', 'DONE'), task('b', 'golf'), task('c', 'golf')]

    expect(openTasksOfVehicle(tasks, 'golf', 'b').map((t) => t.id)).toEqual(['c'])
  })

  it('compares nothing while the vehicle is still open', () => {
    expect(openTasksOfVehicle([task('a', null)], undefined)).toEqual([])
  })
})
