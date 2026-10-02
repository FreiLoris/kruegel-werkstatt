import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('sendet Formulare standardmässig NICHT ab', () => {
    render(<Button>Klick</Button>)
    expect(screen.getByRole('button', { name: 'Klick' }).getAttribute('type')).toBe('button')
  })

  it('ist gesperrt und als beschäftigt markiert, solange er lädt', () => {
    render(<Button laedt>Speichern</Button>)
    const button = screen.getByRole('button', { name: 'Speichern' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
})
