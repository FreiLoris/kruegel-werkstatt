import { describe, expect, it } from 'vitest'
import type { Employee } from '../employees/employeeApi'
import type { Todo } from './todoApi'
import { assigneeAfterDrop, movedTodo, NOBODY_COLUMN, todoColumns } from './todoGroups'

// fictitious
const person = (id: string) => ({ id, name: id }) as Employee
const todo = (id: string, assigneeId: string | null) => ({ id, assigneeId }) as Todo
const people = [person('reto'), person('erich'), person('carina')]

describe('todoColumns', () => {
  it('has "nicht zugewiesen" first, then every person in the order of the list – also without to-dos', () => {
    const columns = todoColumns([todo('a', 'erich'), todo('b', 'reto'), todo('c', 'erich')], people)

    expect(columns.map((c) => c.id)).toEqual([NOBODY_COLUMN, 'reto', 'erich', 'carina'])
    expect(columns[2].todos.map((t) => t.id)).toEqual(['a', 'c'])
    expect(columns[3].todos).toEqual([])
  })

  it('keeps unassigned ones and those of people no longer in the list in the first column', () => {
    const columns = todoColumns([todo('a', null), todo('b', 'left'), todo('c', 'reto')], people)

    expect(columns[0].todos.map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('movedTodo', () => {
  it('gives the to-do to the person of the column, the first column = nobody', () => {
    expect(movedTodo([todo('a', 'reto')], 'a', 'erich')[0].assigneeId).toBe('erich')
    expect(movedTodo([todo('a', 'reto')], 'a', NOBODY_COLUMN)[0].assigneeId).toBeNull()
  })
})

describe('assigneeAfterDrop', () => {
  it('assigns or unassigns by the real assignment', () => {
    expect(assigneeAfterDrop(todo('a', 'reto'), 'mora')).toBe('mora')
    expect(assigneeAfterDrop(todo('a', 'reto'), NOBODY_COLUMN)).toBeNull()
    expect(assigneeAfterDrop(todo('a', null), 'reto')).toBe('reto')
  })

  it('nothing changes when it already belongs there', () => {
    expect(assigneeAfterDrop(todo('a', 'reto'), 'reto')).toBeUndefined()
    expect(assigneeAfterDrop(todo('a', null), NOBODY_COLUMN)).toBeUndefined()
  })

  it('a to-do of someone who left lies in "nicht zugewiesen" – dropping it there unassigns it', () => {
    expect(assigneeAfterDrop(todo('a', 'left'), NOBODY_COLUMN)).toBeNull()
  })
})
