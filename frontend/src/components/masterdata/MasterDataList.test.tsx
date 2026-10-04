import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MasterDataList, type MasterDataListTexts } from './MasterDataList'

const texts: MasterDataListTexts = {
  title: 'Lifts',
  description: '',
  add: 'Lift hinzufügen',
  deactivate: 'Stilllegen',
  inactive: 'Stillgelegt',
  activate: 'Wieder in Betrieb',
}

const lifts = [
  { id: '1', name: 'Lift 1', active: true },
  { id: '2', name: 'Lift 2', active: true },
  { id: '3', name: 'Alt', active: false },
]

function show(props: Partial<Parameters<typeof MasterDataList>[0]> = {}) {
  const handlers = { onAdd: vi.fn(), onRename: vi.fn(), onDeactivate: vi.fn(), onActivate: vi.fn(), onReorder: vi.fn() }
  render(<MasterDataList entries={lifts} texts={texts} canEdit busy={false} {...handlers} {...props} />)
  return handlers
}

describe('MasterDataList', () => {
  it('moves with ↓ and reports the new order of the active ones', async () => {
    const { onReorder } = show()

    await userEvent.click(screen.getByLabelText('Lift 1 nach unten'))

    expect(onReorder).toHaveBeenCalledWith(['2', '1'])
  })

  it('shows inactive ones separately with "Wieder in Betrieb"', async () => {
    const { onActivate } = show()

    await userEvent.click(screen.getByText('Stillgelegt (1)'))
    await userEvent.click(screen.getByRole('button', { name: 'Wieder in Betrieb' }))

    expect(onActivate).toHaveBeenCalledWith(lifts[2])
  })

  it('protects the last active entry when asked to', () => {
    show({ entries: [lifts[0]], keepOneActive: true })

    expect(screen.getByLabelText('Lift 1: Stilllegen')).toHaveProperty('disabled', true)
  })

  it('shows no buttons in view-only mode', () => {
    show({ canEdit: false })

    expect(screen.queryByRole('button')).toBeNull()
  })
})
