import { describe, expect, it } from 'vitest'
import { byUrgency, dueLabel, dueState } from './todoDue'

describe('dueState', () => {
  it('overdue before today, today, later, or no deadline', () => {
    expect(dueState('2026-10-14', '2026-10-15')).toBe('overdue')
    expect(dueState('2026-10-15', '2026-10-15')).toBe('today')
    expect(dueState('2026-10-16', '2026-10-15')).toBe('later')
    expect(dueState(null, '2026-10-15')).toBe('none')
  })
})

describe('dueLabel', () => {
  it('says since when it is overdue – not only an icon', () => {
    expect(dueLabel('2026-10-14', '2026-10-15')).toBe('überfällig seit 14.10.2026')
    expect(dueLabel('2026-10-15', '2026-10-15')).toBe('heute fällig')
    expect(dueLabel('2026-10-20', '2026-10-15')).toBe('bis 20.10.2026')
    expect(dueLabel(null, '2026-10-15')).toBe('')
  })
})

describe('byUrgency', () => {
  it('earliest deadline first, without deadline last, the list itself unchanged', () => {
    const todos = [{ id: 'none', dueDate: null }, { id: 'later', dueDate: '2026-10-20' }, { id: 'overdue', dueDate: '2026-10-01' }]

    expect(byUrgency(todos).map((t) => t.id)).toEqual(['overdue', 'later', 'none'])
    expect(todos[0].id).toBe('none')
  })
})
