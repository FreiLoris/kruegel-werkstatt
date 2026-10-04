import { Wrench } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { useEffect } from 'react'
import { useCompany } from '../features/company/companyApi'
import { useActiveEmployees } from '../features/employees/employeeApi'
import styles from './AppLayout.module.css'
import { LiveIndicator } from './live/LiveIndicator'
import { useLiveUpdates } from './live/useLiveUpdates'
import { navigation } from './navigation'
import { PersonMenu } from './person/PersonMenu'
import { PersonPicker } from './person/PersonPicker'
import { useDevicePerson } from './person/useDevicePerson'

/**
 * Frame of every page: header with navigation, below it the page content.
 * `<Outlet />` is where the router inserts the current page.
 *
 * If the device has not said yet who uses it, the person picker appears instead of the page.
 */
export function AppLayout() {
  const liveStatus = useLiveUpdates()
  const device = useDevicePerson()
  const { data: active = [] } = useActiveEmployees()
  const { data: company } = useCompany()

  // Browser tab and bookmarks carry the workshop's name
  useEffect(() => {
    if (company) document.title = company.name
  }, [company])

  return (
    <>
      <header className={styles.header}>
        {/* name and logo from the settings (company profile) */}
        <Link to="/" className={styles.brand}>
          {company?.logoUrl ? <img src={company.logoUrl} alt="" className={styles.logo} /> : <Wrench aria-hidden />}
          {company?.name ?? 'Werkstatt'}
        </Link>
        <nav className={styles.nav}>
          {navigation.map((entry) => (
            <NavLink
              key={entry.path}
              to={entry.path}
              // "end": home link only active for exactly "/", not for every sub page
              end={entry.path === '/'}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {entry.title}
            </NavLink>
          ))}
        </nav>
        <PersonMenu status={device} />
        <LiveIndicator status={liveStatus} />
      </header>
      <main className={styles.content}>
        {device.kind === 'choose' ? <PersonPicker active={active} noLongerActive={device.noLongerActive !== undefined} /> : <Outlet />}
      </main>
    </>
  )
}
