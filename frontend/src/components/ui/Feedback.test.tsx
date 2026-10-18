import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

function UndoDemo({ onUndo }: { onUndo: () => void }) {
  const toast = useToast()
  return <Button onClick={() => toast.success('Ausgelagert', { label: 'Rückgängig', onClick: onUndo })}>Auslagern</Button>
}

describe('Toast', () => {
  it('"Rückgängig" in the message does it and closes the message', async () => {
    const undo = vi.fn()
    render(
      <ToastProvider>
        <UndoDemo onUndo={undo} />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Auslagern' }))
    // the region is a popover – jsdom does not open it, so by text
    await userEvent.click(screen.getByText('Rückgängig'))

    expect(undo).toHaveBeenCalledOnce()
    expect(screen.queryByText('Ausgelagert')).toBeNull()
  })

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

  it('a second question answers the open one with false – its caller does not wait forever', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    // The modal blocks the page in a real browser; code can still ask again
    await userEvent.click(screen.getByRole('button', { name: 'Start', hidden: true }))

    expect(screen.getByRole('status', { hidden: true }).textContent).toBe('cancelled')
  })
})
