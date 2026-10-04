import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { ConfirmProvider } from './Confirm'
import { useConfirm } from './confirmContext'
import { ToastProvider } from './Toast'
import { useToast } from './toastContext'

function ToastDemo() {
  const toast = useToast()
  return <Button onClick={() => toast.success('Gespeichert')}>Zeigen</Button>
}

function DeleteDemo() {
  const confirm = useConfirm()
  const [result, setResult] = useState('open')
  return (
    <>
      <Button
        onClick={async () => {
          const ok = await confirm({ title: 'Löschen?', text: 'Wirklich?', confirmLabel: 'Löschen', dangerous: true })
          setResult(ok ? 'confirmed' : 'cancelled')
        }}
      >
        Start
      </Button>
      <output>{result}</output>
    </>
  )
}

describe('Toast', () => {
  it('shows the message', async () => {
    render(
      <ToastProvider>
        <ToastDemo />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Zeigen' }))

    // hidden: true – jsdom knows the popover attribute (hides it) but cannot open popovers.
    // In a real browser the message is visible (checked manually, also above modals).
    expect(screen.getByRole('status', { hidden: true }).textContent).toContain('Gespeichert')
  })
})

describe('Confirm', () => {
  function renderDemo() {
    render(
      <ConfirmProvider>
        <DeleteDemo />
      </ConfirmProvider>,
    )
  }

  it('returns true when confirmed', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(screen.getByRole('status').textContent).toBe('confirmed')
  })

  it('returns false when cancelled', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.getByRole('status').textContent).toBe('cancelled')
  })

  it('puts the focus on "Abbrechen" for dangerous actions', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(document.activeElement?.textContent).toBe('Abbrechen')
  })
})
