import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ApiError, reasonOf } from '../../api/errors'
import { Button } from './Button'
import styles from './LoadFailed.module.css'

/**
 * A page whose record could not be loaded (UX M-08): "not there" in words instead of an ID and a
 * technical message, always with a way back – and "Nochmals versuchen" when it was the network.
 *
 * @param what     "Auftrag", "Satz" … – for the heading
 * @param notFound the sentence when it does not exist (deleted elsewhere, or a broken link)
 * @param back     where to go from here
 */
export function LoadFailed({
  what,
  error,
  notFound,
  back,
  onRetry,
}: {
  what: string
  error: Error
  notFound: string
  back: { to: string; label: string }
  onRetry?: () => void
}) {
  const navigate = useNavigate()
  // 404: deleted, or never there; 400: the address itself is wrong (a cut-off link)
  const missing = error instanceof ApiError && (error.problem.status === 404 || error.problem.status === 400)

  return (
    <section className={styles.box}>
      <h1>{missing ? `${what} nicht gefunden` : `${what} konnte nicht geladen werden`}</h1>
      <p>{missing ? notFound : `${reasonOf(error)} Meist hilft es, es nochmals zu versuchen.`}</p>
      <div className={styles.actions}>
        {!missing && onRetry && (
          <Button variant="primary" icon={RotateCcw} onClick={onRetry}>
            Nochmals versuchen
          </Button>
        )}
        <Button icon={ArrowLeft} onClick={() => navigate(back.to)}>
          {back.label}
        </Button>
      </div>
    </section>
  )
}
