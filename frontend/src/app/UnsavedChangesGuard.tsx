import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'
import { useConfirm } from '../components/ui/confirmContext'
import { unsavedChanges } from './unsavedChanges'

/** Asks before a page with unsaved input is left – see `useUnsavedChanges`. Once, in the layout. */
export function UnsavedChangesGuard() {
  const confirm = useConfirm()
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsavedChanges.any() && currentLocation.pathname !== nextLocation.pathname)

  // the blocker object changes with every render – one question per blocked navigation, not one per render
  const current = useRef(blocker)
  useEffect(() => {
    current.current = blocker
  })

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    void confirm({
      title: 'Eingaben verwerfen?',
      text: 'Was hier eingegeben wurde, ist noch nicht gespeichert und geht beim Verlassen verloren.',
      confirmLabel: 'Verwerfen',
      cancelLabel: 'Weiter bearbeiten',
      dangerous: true,
    }).then((discard) => {
      if (discard) {
        unsavedChanges.clear()
        current.current.proceed?.()
      } else {
        current.current.reset?.()
      }
    })
  }, [blocker.state, confirm])

  useEffect(() => {
    const ask = (event: BeforeUnloadEvent) => {
      if (unsavedChanges.any()) event.preventDefault()
    }
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [])

  return null
}
