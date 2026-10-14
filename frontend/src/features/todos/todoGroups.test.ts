import { describe, expect, it } from 'vitest'
import type { Employee } from '../employees/employeeApi'
import type { Todo } from './todoApi'
import { todosByPerson } from './todoGroups'

// fictitious
const person = (id: string) => ({ id, name: id }) as Employee
const todo = (id: string, assigneeId: string | null) => ({ id, assigneeId }) as Todo
const people = [person('reto'), person('erich'), person('carina')]

describe('todosByPerson', () => {
  it('groups in the order of the employee list, only people with something open', () => {
    const groups = todosByPerson([todo('a', 'erich'), todo('b', 'reto'), todo('c', 'erich')], people)

    expect(groups.map((g) => g.id)).toEqual(['reto', 'erich'])
    expect(groups[1].todos.map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('puts unassigned ones and those of people no longer in the list last', () => {
    const groups = todosByPerson([todo('a', null), todo('b', 'left'), todo('c', 'reto')], people)

    expect(groups.map((g) => g.id)).toEqual(['reto', null])
    expect(groups[1].todos.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('has no groups when nothing is open', () => {
    expect(todosByPerson([], people)).toEqual([])
  })
})
