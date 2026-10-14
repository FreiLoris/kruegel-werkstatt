import { NavLink } from 'react-router'
import { materialPages } from '../../app/navigation'
import styles from './MaterialTabs.module.css'

/**
 * Shopping list, stock list (and later suppliers) belong together (FB-08/FB-09) – one entry
 * "Material" in the navigation, the pages as tabs above them. Keeps the TV's bottom bar on one line.
 */
export function MaterialTabs() {
  return (
    <nav className={styles.tabs} aria-label="Material">
      {materialPages.map((page) => (
        <NavLink key={page.path} to={page.path} className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}>
          {page.title}
        </NavLink>
      ))}
    </nav>
  )
}
