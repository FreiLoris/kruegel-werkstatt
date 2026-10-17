import { render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { CrashPage } from './ErrorPages'

function Broken(): never {
  throw new Error('Cannot read properties of undefined')
}

describe('CrashPage', () => {
  it('says it in German, keeps the frame and folds the technical message away', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <>
              <nav aria-label="Hauptnavigation" />
              <Outlet />
            </>
          ),
          children: [{ errorElement: <CrashPage framed />, children: [{ index: true, element: <Broken /> }] }],
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: 'Etwas ist schiefgelaufen' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seite neu laden' })).toBeTruthy()
    expect(screen.getByText('Technische Angaben')).toBeTruthy()
    expect(screen.getByText('Cannot read properties of undefined')).toBeTruthy()
    vi.restoreAllMocks()
  })
})
