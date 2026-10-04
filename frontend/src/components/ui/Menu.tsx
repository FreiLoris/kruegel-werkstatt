import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Menu.module.css'

/**
 * Dropdown menu based on the browser's native popover feature (`popover` attribute).
 *
 * The browser closes the menu automatically on Esc and on a click outside
 * (UI review F9: the settings menu stayed open).
 *
 *   <Menu label="Einstellungen" icon={Settings}>
 *     <MenuItem icon={Upload} onClick={…}>SwissGarage Import</MenuItem>
 *   </Menu>
 */
export function Menu({ label, icon: Icon, children }: { label: string; icon?: LucideIcon; children: ReactNode }) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Position right below the button when opening (popovers are centered in the window otherwise).
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    function position(event: Event) {
      if ((event as ToggleEvent).newState !== 'open' || !triggerRef.current || !menu) return
      const button = triggerRef.current.getBoundingClientRect()
      menu.style.top = `${button.bottom + 4}px`
      menu.style.left = `${Math.max(8, Math.min(button.left, window.innerWidth - 248))}px`
    }

    menu.addEventListener('beforetoggle', position)
    return () => menu.removeEventListener('beforetoggle', position)
  }, [])

  return (
    <>
      <button ref={triggerRef} type="button" className={styles.trigger} popoverTarget={id}>
        {Icon && <Icon aria-hidden />}
        {label}
        <ChevronDown aria-hidden className={styles.chevron} />
      </button>
      <div ref={menuRef} id={id} popover="auto" className={styles.menu} role="menu">
        {children}
      </div>
    </>
  )
}

export function MenuItem({ icon: Icon, onClick, children }: { icon?: LucideIcon; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={styles.item}
      onClick={(event) => {
        // Close the menu after the selection
        event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
        onClick()
      }}
    >
      {Icon && <Icon aria-hidden />}
      {children}
    </button>
  )
}
