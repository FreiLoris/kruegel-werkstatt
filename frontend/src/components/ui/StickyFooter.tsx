import type { ReactNode } from 'react'
import styles from './StickyFooter.module.css'

/**
 * Bar fixed at the bottom of the screen for the main buttons of a long form (wizard, edit
 * task) – never cut off or scrolled away (UI review). The page needs `StickyFooter.spacer` space
 * at its end, so the bar does not cover the last field.
 */
export function StickyFooter({ children }: { children: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>
}

/** Put at the end of the page content: room for the footer */
export function StickyFooterSpacer() {
  return <div className={styles.spacer} aria-hidden />
}
