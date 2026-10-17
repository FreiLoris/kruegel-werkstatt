import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ConfirmProvider } from '../components/ui/Confirm'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'
import { useUnsavedChanges } from './useUnsavedChanges'

function Form() {
  const [text, setText] = useState('')
  const leave = useUnsavedChanges(text !== '')
  return (
    <>
      <input aria-label="Text" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={leave}>
        Gespeichert
      </button>
    </>
  )
}

function renderForm() {
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <>
          <Link to="/other">Weg</Link>
          <Outlet />
          <UnsavedChangesGuard />
        </>
      ),
      children: [
        { index: true, element: <Form /> },
        { path: 'other', element: <p>Andere Seite</p> },
      ],
    },
  ])
  render(
    <ConfirmProvider>
      <RouterProvider router={router} />
    </ConfirmProvider>,
  )
}

describe('UnsavedChangesGuard', () => {
  it('leaves an untouched form without a question', async () => {
    renderForm()
    fireEvent.click(screen.getByText('Weg'))
    expect(await screen.findByText('Andere Seite')).toBeTruthy()
  })

  it('asks before typed input is lost – "Weiter bearbeiten" keeps it', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'halb getippt' } })
    fireEvent.click(screen.getByText('Weg'))

    fireEvent.click(await screen.findByRole('button', { name: 'Weiter bearbeiten' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Weiter bearbeiten' })).toBeNull())
    expect((screen.getByLabelText('Text') as HTMLInputElement).value).toBe('halb getippt')

    fireEvent.click(screen.getByText('Weg'))
    fireEvent.click(await screen.findByRole('button', { name: 'Verwerfen' }))
    expect(await screen.findByText('Andere Seite')).toBeTruthy()
  })

  it('lets go without asking once the form says it was saved', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'gespeichert' } })
    fireEvent.click(screen.getByText('Gespeichert'))
    fireEvent.click(screen.getByText('Weg'))
    expect(await screen.findByText('Andere Seite')).toBeTruthy()
  })
})
