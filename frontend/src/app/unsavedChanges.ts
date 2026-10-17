/**
 * Which forms on screen hold input that is not saved yet (UX G-01/G-02). Forms report it with
 * `useUnsavedChanges`; one `UnsavedChangesGuard` in the layout asks before leaving – react-router
 * allows only one blocker at a time, and the settings page has several forms.
 */
const dirtyForms = new Set<symbol>()

export const unsavedChanges = {
  mark(form: symbol, dirty: boolean) {
    if (dirty) dirtyForms.add(form)
    else dirtyForms.delete(form)
  },
  any: () => dirtyForms.size > 0,
  /** after "Verwerfen": the forms are about to disappear with their page */
  clear: () => dirtyForms.clear(),
}
