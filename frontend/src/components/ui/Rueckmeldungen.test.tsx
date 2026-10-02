import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { BestaetigungProvider } from './Bestaetigung'
import { useBestaetigung } from './bestaetigungKontext'
import { Button } from './Button'
import { ToastProvider } from './Toast'
import { useToast } from './toastKontext'

function ToastDemo() {
  const toast = useToast()
  return <Button onClick={() => toast.erfolg('Gespeichert')}>Zeigen</Button>
}

function LoeschDemo() {
  const bestaetige = useBestaetigung()
  const [ergebnis, setErgebnis] = useState('offen')
  return (
    <>
      <Button
        onClick={async () => {
          const ok = await bestaetige({ titel: 'Löschen?', text: 'Wirklich?', bestaetigenText: 'Löschen', gefaehrlich: true })
          setErgebnis(ok ? 'bestätigt' : 'abgebrochen')
        }}
      >
        Start
      </Button>
      <output>{ergebnis}</output>
    </>
  )
}

describe('Toast', () => {
  it('zeigt die Meldung an', async () => {
    render(
      <ToastProvider>
        <ToastDemo />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Zeigen' }))

    // hidden: true – jsdom kennt das popover-Attribut (blendet aus), kann Popover aber nicht
    // öffnen. Im echten Browser ist die Meldung sichtbar (manuell geprüft, auch über Modals).
    expect(screen.getByRole('status', { hidden: true }).textContent).toContain('Gespeichert')
  })
})

describe('Bestätigung', () => {
  function renderDemo() {
    render(
      <BestaetigungProvider>
        <LoeschDemo />
      </BestaetigungProvider>,
    )
  }

  it('liefert true, wenn bestätigt wird', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(screen.getByRole('status').textContent).toBe('bestätigt')
  })

  it('liefert false, wenn abgebrochen wird', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.getByRole('status').textContent).toBe('abgebrochen')
  })

  it('setzt den Fokus bei gefährlichen Aktionen auf "Abbrechen"', async () => {
    renderDemo()
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(document.activeElement?.textContent).toBe('Abbrechen')
  })
})
