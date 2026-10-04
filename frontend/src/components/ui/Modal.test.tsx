import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Modal } from './Modal'

describe('Modal', () => {
  it('focuses the first input field on open – not the close button', () => {
    render(
      <Modal open onClose={() => {}} title="Lift umbenennen">
        <input aria-label="Name" />
      </Modal>,
    )

    // Otherwise typing goes nowhere and Enter "clicks" the X (found in the browser)
    expect(document.activeElement).toBe(screen.getByLabelText('Name'))
  })

  it('prefers the element marked with data-autofocus', () => {
    render(
      <Modal open onClose={() => {}} title="Löschen?" footer={<Button data-autofocus>Abbrechen</Button>}>
        <input aria-label="Name" />
      </Modal>,
    )

    expect(document.activeElement?.textContent).toBe('Abbrechen')
  })
})
