import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Nach jedem Test die gerenderten Komponenten entfernen → jeder Test startet leer.
afterEach(() => {
  cleanup()
})

// jsdom kennt <dialog> als Element, aber (noch) nicht showModal()/close().
// Minimaler Ersatz, damit Modal-Komponenten in Tests funktionieren.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
  }
}
