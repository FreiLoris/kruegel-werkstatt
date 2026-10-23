import { ChevronRight } from 'lucide-react'
import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './FittingList.module.css'
import { visibleCount } from './visibleCount'

interface FittingListProps {
  /** one `<li>` each */
  children: ReactNode
  /** the page with all of them – "+ n weitere" leads there */
  moreTo: string
  /** left out before already (e.g. a maximum per day) – counted in "+ n weitere" */
  alsoHidden?: number
  className?: string
  'aria-label'?: string
}

/**
 * A list on the TV, which cannot scroll: it shows what fits its height and "+ n weitere" for the rest
 * – on a Full HD TV fewer, on a 4K one more. Without a limited height (a laptop: the page scrolls)
 * every item is shown. The height comes from the layout around it (a flex or grid row).
 */
export function FittingList({ children, moreTo, alsoHidden = 0, className, 'aria-label': label }: FittingListProps) {
  const list = useRef<HTMLUListElement>(null)
  const [hidden, setHidden] = useState(0)
  const count = Children.count(children)

  useLayoutEffect(() => {
    const element = list.current
    if (!element) return
    const fit = () => {
      const items = [...element.children].filter((child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute('data-more'))
      items.forEach((item) => (item.hidden = false))
      const style = getComputedStyle(element)
      // clipped at the inner edge of the border – an item may reach into the padding
      const limit = element.getBoundingClientRect().top + element.clientHeight
      // the "+ n weitere" line as it is – before it exists, a small line (it is set in small text)
      const shown = element.querySelector<HTMLElement>(':scope > [data-more]')
      const moreLine = (shown ? shown.offsetHeight : (parseFloat(style.fontSize) || 16) * 1.35) + (parseFloat(style.rowGap) || 0)
      const visible = visibleCount(
        items.map((item) => item.getBoundingClientRect().bottom),
        limit,
        moreLine,
      )
      items.forEach((item, index) => (item.hidden = index >= visible))
      setHidden(items.length - visible)
    }
    fit()
    // the TV's window or a neighbour changes – fit again (not in tests: no layout there)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [count, children])

  const more = hidden + alsoHidden
  return (
    <ul ref={list} className={[styles.list, className].filter(Boolean).join(' ')} aria-label={label}>
      {children}
      {more > 0 && (
        <li data-more="">
          <Link to={moreTo} className={styles.more}>
            + {more} weitere <ChevronRight size={14} aria-hidden />
          </Link>
        </li>
      )}
    </ul>
  )
}
