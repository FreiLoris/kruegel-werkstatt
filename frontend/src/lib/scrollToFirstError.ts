/**
 * After "Weiter"/"Speichern" with missing input: to the first marked field and into it (UX M-08) –
 * the page top alone left the field out of sight on a long form. Waits a frame: the marks
 * appear with the render that `showRequired` triggers.
 */
export function scrollToFirstError() {
  requestAnimationFrame(() => {
    const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
    if (!first) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    first.scrollIntoView({ block: 'center', behavior: 'smooth' })
    if (first.matches('input, select, textarea')) first.focus({ preventScroll: true })
  })
}
