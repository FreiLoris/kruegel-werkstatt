import { useCallback, useEffect, useRef, useState } from 'react'
import { unsavedChanges } from './unsavedChanges'

/**
 * Warns before typed input is lost (UX G-01/G-02): going to another page in the app asks first,
 * closing or reloading the tab gets the browser's own question (`UnsavedChangesGuard`).
 *
 *   const leave = useUnsavedChanges(changed)
 *   … onSuccess: () => { leave(); navigate(…) }   // saved: leaving is fine now
 *
 * @returns call it right before navigating away on purpose (after saving)
 */
export function useUnsavedChanges(dirty: boolean): () => void {
  const [form] = useState(() => Symbol('form'))
  const left = useRef(false)

  useEffect(() => {
    unsavedChanges.mark(form, dirty && !left.current)
    return () => unsavedChanges.mark(form, false)
  }, [form, dirty])

  return useCallback(() => {
    left.current = true
    unsavedChanges.mark(form, false)
  }, [form])
}
