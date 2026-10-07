import { describe, expect, it } from 'vitest'
import type { Employee } from '../employees/employeeApi'
import type { Todo } from '../todos/todoApi'
import type { Note } from './noteApi'
import { archiveByMonth, movedNote, movedTodo, NEW_COLUMN, pinboardColumns } from './pinboard'

const person = (id: string, hasPinboardColumn = true, active = true) => ({ id, name: id, active, hasPinboardColumn }) as Employee
const note = (id: string, assigneeIds: string[], archivedAt: string | null = null) => ({ id, assigneeIds, archivedAt }) as Note
const todo = (id: string, assigneeId: string | null) => ({ id, assigneeId }) as Todo

describe('pinboardColumns', () => {
  const people = [person('reto'), person('erich'), person('lehrling', false), person('weg', true, false)]

  it('"Neu" first, then the people with a column in their order', () => {
    expect(pinboardColumns([], [], people).map((c) => c.id)).toEqual([NEW_COLUMN, 'reto', 'erich'])
  })

  it('a note for two people is in both columns; one without a column-person stays visible in "Neu"', () => {
    const columns = pinboardColumns(
      [note('beide', ['reto', 'erich']), note('niemand', []), note('lehrling', ['lehrling']), note('weg', ['weg'])],
      [],
      people,
    )

    expect(columns.find((c) => c.id === 'reto')!.notes.map((n) => n.id)).toEqual(['beide'])
    expect(columns.find((c) => c.id === 'erich')!.notes.map((n) => n.id)).toEqual(['beide'])
    expect(columns[0].notes.map((n) => n.id)).toEqual(['niemand', 'lehrling', 'weg'])
  })
})

describe('to-dos on the board', () => {
  it('in the column of their person – nobody or a person without column in "Neu"', () => {
    const columns = pinboardColumns(
      [],
      [todo('reto', 'reto'), todo('frei', null), todo('lehrling', 'lehrling')],
      [person('reto'), person('lehrling', false)],
    )

    expect(columns.find((c) => c.id === 'reto')!.todos.map((t) => t.id)).toEqual(['reto'])
    expect(columns[0].todos.map((t) => t.id)).toEqual(['frei', 'lehrling'])
  })

  it('dragging gives the to-do to the person of the column, "Neu" = nobody', () => {
    expect(movedTodo([todo('a', 'reto')], 'a', 'erich')[0].assigneeId).toBe('erich')
    expect(movedTodo([todo('a', 'reto')], 'a', NEW_COLUMN)[0].assigneeId).toBeNull()
  })
})

describe('movedNote', () => {
  it('swaps only the dragged person, like the server', () => {
    const notes = [note('a', ['reto', 'erich'])]

    expect(movedNote(notes, 'a', 'reto', 'mora')[0].assigneeIds).toEqual(['erich', 'mora'])
    expect(movedNote(notes, 'a', 'reto', NEW_COLUMN)[0].assigneeIds).toEqual(['erich'])
    expect(movedNote([note('b', [])], 'b', NEW_COLUMN, 'reto')[0].assigneeIds).toEqual(['reto'])
    // onto someone who already has it: nothing doubled
    expect(movedNote(notes, 'a', 'reto', 'erich')[0].assigneeIds).toEqual(['erich'])
  })
})

describe('archiveByMonth', () => {
  it('groups by month in Swiss time', () => {
    const groups = archiveByMonth([
      note('neu', [], '2026-10-01T00:30:00+02:00'),
      note('auch', [], '2026-10-15T10:00:00Z'),
      note('alt', [], '2026-09-30T21:00:00Z'),
    ])

    expect(groups.map((g) => [g.month, g.notes.map((n) => n.id)])).toEqual([
      ['Oktober 2026', ['neu', 'auch']],
      ['September 2026', ['alt']],
    ])
  })
})
