import { describe, expect, it } from 'vitest'
import type { ShoppingItem } from '../shopping/shoppingApi'
import { newTiresTaskIds, tasksWaitingForTires, tiresNotDelivered } from './newTires'

// fictitious positions
const item = (description: string, status: ShoppingItem['status'], taskId: string | null = 't1') =>
  ({ description, status, task: taskId ? { id: taskId } : null }) as ShoppingItem

describe('new tyres not delivered (FB-25)', () => {
  it('the tyre position open – ordered or still to order', () => {
    expect(tiresNotDelivered([item('Reifen 205/55 R16 91H', 'ORDERED')])).toBe(true)
    expect(tiresNotDelivered([item('Reifen (Dimension offen)', 'TO_ORDER')])).toBe(true)
  })

  it('arrived or cancelled – or only other parts open: nothing to say', () => {
    expect(tiresNotDelivered([item('Reifen 205/55 R16 91H', 'ARRIVED'), item('Bremsscheiben', 'ORDERED')])).toBe(false)
    expect(tiresNotDelivered([item('Reifen 205/55 R16 91H', 'CANCELLED')])).toBe(false)
    expect(tiresNotDelivered([item('Reifenventile', 'ORDERED')])).toBe(false)
  })

  it('per task, only tasks with new tyres asked for', () => {
    expect(newTiresTaskIds([{ id: 'a', tireChangeKind: 'NEW_TIRES' }, { id: 'b', tireChangeKind: 'WHEELS_STORED' }])).toEqual(['a'])
    expect([...tasksWaitingForTires([item('Reifen 205/55 R16', 'ORDERED', 'a'), item('Reifen 195/65 R15', 'ARRIVED', 'b'), item('Reifen x', 'ORDERED', null)])]).toEqual(['a'])
  })
})
