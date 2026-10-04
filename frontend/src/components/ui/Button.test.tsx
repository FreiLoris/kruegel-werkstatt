import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('does NOT submit forms by default', () => {
    render(<Button>Klick</Button>)
    expect(screen.getByRole('button', { name: 'Klick' }).getAttribute('type')).toBe('button')
  })

  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Speichern</Button>)
    const button = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
})
