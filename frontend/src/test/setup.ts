import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove the rendered components after each test → every test starts empty.
afterEach(() => {
  cleanup()
})

// jsdom knows <dialog> as an element but not (yet) showModal()/close().
// Minimal replacement so modal components work in tests.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
  }
}
