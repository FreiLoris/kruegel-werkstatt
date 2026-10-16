import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

  it('closes on a click on the backdrop', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Lift umbenennen">
        <input aria-label="Name" />
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')

    fireEvent.pointerDown(dialog)
    fireEvent.click(dialog)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('stays open when selecting text in a field ends outside the dialog', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Lift umbenennen">
        <input aria-label="Name" />
      </Modal>,
    )

    // Press in the field, release over the backdrop: the browser sends the click to the dialog element
    fireEvent.pointerDown(screen.getByLabelText('Name'))
    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
