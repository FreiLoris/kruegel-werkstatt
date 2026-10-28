import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormerBadge } from './FormerBadge'

describe('FormerBadge (FB-27)', () => {
  it('"ehemalig" for a former customer only', () => {
    const { rerender } = render(<FormerBadge customer={{ former: true }} />)
    expect(screen.getByText('ehemalig')).toBeTruthy()
    rerender(<FormerBadge customer={{ former: false }} />)
    expect(screen.queryByText('ehemalig')).toBeNull()
  })
})
