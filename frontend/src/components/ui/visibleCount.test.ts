import { describe, expect, it } from 'vitest'
import { visibleCount } from './visibleCount'

describe('visibleCount', () => {
  it('all fit – no "+ n weitere" line needed', () => {
    expect(visibleCount([40, 80, 120], 120, 20)).toBe(3)
  })

  it('some stick out – the line takes the room of one more', () => {
    // 120 is the limit, the line needs 20: the third (ending at 120) makes way for it
    expect(visibleCount([40, 80, 120, 160], 120, 20)).toBe(2)
  })

  it('from the first sticking out on none – a shorter later one does not jump in', () => {
    expect(visibleCount([40, 140, 150], 130, 0)).toBe(1)
  })

  it('a list without items or without room', () => {
    expect(visibleCount([], 100, 20)).toBe(0)
    expect(visibleCount([40], 10, 20)).toBe(0)
  })
})
