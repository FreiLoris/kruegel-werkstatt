import { Home, RotateCcw } from 'lucide-react'
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { Button } from '../components/ui/Button'
import styles from './ErrorPages.module.css'

/** For URLs that have no page. */
export function NotFoundPage() {
  return (
    <>
      <h1>Seite nicht gefunden</h1>
      <p className="muted">Diese Adresse gibt es nicht.</p>
      <Link to="/">Zur Startseite</Link>
    </>
  )
}

/**
 * Shown when an unexpected error occurs while rendering a page – instead of a white page. In German
 * for everyone; the technical message only folded away (it helps when reporting the error).
 *
 * @param framed inside the app frame (header and navigation stay) – otherwise a page of its own
 */
export function CrashPage({ framed = false }: { framed?: boolean }) {
  const error = useRouteError()
  const navigate = useNavigate()
  const technical = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error)

  const content = (
    <>
      <h1>Etwas ist schiefgelaufen</h1>
      <p>Diese Seite konnte nicht angezeigt werden. Meist hilft es, sie neu zu laden.</p>
      <div className={styles.actions}>
        <Button variant="primary" icon={RotateCcw} onClick={() => window.location.reload()}>
          Seite neu laden
        </Button>
        <Button icon={Home} onClick={() => navigate('/')}>
          Zur Startseite
        </Button>
      </div>
      <details className={styles.details}>
        <summary>Technische Angaben</summary>
        <p>{technical}</p>
      </details>
    </>
  )
  return framed ? content : <main className={styles.page}>{content}</main>
}
