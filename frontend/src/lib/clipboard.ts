/**
 * Puts text on the clipboard. The workshop opens the app over plain http (NAS in the local network),
 * where the browser offers no `navigator.clipboard` – then the old way through a hidden text field.
 *
 * @throws Error if the browser allows neither
 */
export async function copyText(text: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  // deprecated, but the only way without https
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('Kopieren nicht erlaubt')
}
