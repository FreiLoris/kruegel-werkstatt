import { describe, expect, it } from 'vitest'
import type { Employee } from '../../features/employees/employeeApi'
import { canEdit, deviceStatus } from './deviceStatus'

const erich = { id: 'erich', name: 'Erich' } as Employee

describe('deviceStatus', () => {
  it('asks as long as nothing is chosen', () => {
    expect(deviceStatus(null, [erich], false)).toEqual({ kind: 'choose' })
  })

  it('recognises the chosen active person', () => {
    const status = deviceStatus({ kind: 'person', id: 'erich' }, [erich], false)
    expect(status).toEqual({ kind: 'person', person: erich })
    expect(canEdit(status)).toBe(true)
  })

  it('asks again when the chosen person is no longer active', () => {
    expect(deviceStatus({ kind: 'person', id: 'mora' }, [erich], false)).toEqual({ kind: 'choose', noLongerActive: 'mora' })
  })

  it('"view only" may not edit', () => {
    const status = deviceStatus({ kind: 'viewOnly' }, [erich], false)
    expect(status.kind).toBe('viewOnly')
    expect(canEdit(status)).toBe(false)
  })

  it('initial setup: without employees editing is allowed', () => {
    const status = deviceStatus(null, [], false)
    expect(status.kind).toBe('setup')
    expect(canEdit(status)).toBe(true)
  })

  it('does not block when the list cannot be loaded', () => {
    expect(deviceStatus(null, undefined, true).kind).toBe('unknown')
    expect(deviceStatus(null, undefined, false).kind).toBe('loading')
  })
})
