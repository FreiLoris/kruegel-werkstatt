import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Menue.module.css'

/**
 * Aufklappmenü auf Basis der nativen Popover-Funktion des Browsers (`popover`-Attribut).
 *
 * Der Browser schliesst das Menü automatisch bei Esc und bei Klick daneben
 * (UI-Review F9: Einstellungen-Menü blieb offen).
 *
 *   <Menue label="Einstellungen" icon={Settings}>
 *     <MenueEintrag icon={Upload} onClick={…}>SwissGarage Import</MenueEintrag>
 *   </Menue>
 */
export function Menue({ label, icon: Icon, children }: { label: string; icon?: LucideIcon; children: ReactNode }) {
  const id = useId()
  const ausloeserRef = useRef<HTMLButtonElement>(null)
  const menueRef = useRef<HTMLDivElement>(null)

  // Beim Öffnen direkt unter dem Button positionieren (Popover liegen sonst mittig im Fenster).
  useEffect(() => {
    const menue = menueRef.current
    if (!menue) return

    function positionieren(event: Event) {
      if ((event as ToggleEvent).newState !== 'open' || !ausloeserRef.current || !menue) return
      const knopf = ausloeserRef.current.getBoundingClientRect()
      menue.style.top = `${knopf.bottom + 4}px`
      menue.style.left = `${Math.max(8, Math.min(knopf.left, window.innerWidth - 248))}px`
    }

    menue.addEventListener('beforetoggle', positionieren)
    return () => menue.removeEventListener('beforetoggle', positionieren)
  }, [])

  return (
    <>
      <button ref={ausloeserRef} type="button" className={styles.ausloeser} popoverTarget={id}>
        {Icon && <Icon aria-hidden />}
        {label}
        <ChevronDown aria-hidden className={styles.pfeil} />
      </button>
      <div ref={menueRef} id={id} popover="auto" className={styles.menue} role="menu">
        {children}
      </div>
    </>
  )
}

export function MenueEintrag({ icon: Icon, onClick, children }: { icon?: LucideIcon; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={styles.eintrag}
      onClick={(event) => {
        // Menü nach der Auswahl schliessen
        event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
        onClick()
      }}
    >
      {Icon && <Icon aria-hidden />}
      {children}
    </button>
  )
}
