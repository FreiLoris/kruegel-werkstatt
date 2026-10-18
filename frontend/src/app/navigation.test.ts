import { describe, expect, it } from 'vitest'
import { pageTitle } from './navigation'

describe('pageTitle', () => {
  it('the most specific entry, sub pages included; nothing on the start page', () => {
    expect(pageTitle('/tasks/new')).toBe('Neuer Auftrag')
    expect(pageTitle('/tasks/123/edit')).toBe('Termine')
    expect(pageTitle('/stock')).toBe('Lager')
    expect(pageTitle('/system/components')).toBe('System')
    expect(pageTitle('/')).toBe('')
  })
})
