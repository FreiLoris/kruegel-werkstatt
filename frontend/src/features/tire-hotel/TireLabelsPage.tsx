import { ArrowLeft, Printer } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Fields'
import { formatDate } from '../../lib/format'
import { fontSize, ownerLine, spots, spotsFrom, startPositions } from './labelSheet'
import { SEASONS, useLabelFormats, useTireSet, type LabelFormat, type TireSet } from './tireHotelApi'
import styles from './TireLabelsPage.module.css'
import { WHEELS } from './tread'

/** The device remembers its sheet – the same pack lies next to the printer */
const FORMAT_KEY = 'tireLabels.format'

function rememberedFormat(): string | null {
  try {
    return localStorage.getItem(FORMAT_KEY)
  } catch {
    return null
  }
}

function rememberFormat(id: string) {
  try {
    localStorage.setItem(FORMAT_KEY, id)
  } catch {
    // private window: it is chosen again next time
  }
}

/**
 * The labels of a set for its four wheels (FB-07): customer, plate, place, season, wheel and the
 * day it was stored – on an A4 sheet with a normal printer. The sheet format and the start position
 * (an opened sheet goes on where its free labels begin) are chosen above; the preview shows the
 * sheet as it comes out. Outside the app frame, so only the sheet is printed.
 */
export function TireLabelsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const set = useTireSet(id)
  const { data: formats } = useLabelFormats()
  const [formatId, setFormatId] = useState<string | null>(rememberedFormat)
  const [start, setStart] = useState(1)

  const format = formats?.find((f) => f.id === formatId) ?? formats?.[0]
  const starts = format ? startPositions(format) : []
  const from = starts.includes(start) ? start : 1

  function chooseFormat(next: string) {
    setFormatId(next)
    rememberFormat(next)
    setStart(1)
  }

  return (
    <div className={styles.desk}>
      <div className={styles.toolbar}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(id ? `/tires/${id}` : '/tires')}>
          Zum Satz
        </Button>
        {formats && formats.length > 0 && format && (
          <>
            <Select label="Bogen" value={format.id} onChange={(e) => chooseFormat(e.target.value)}>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select label="Start bei Etikett" value={String(from)} onChange={(e) => setStart(Number(e.target.value))} hint="für angebrochene Bögen">
              {starts.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </>
        )}
        <Button variant="primary" icon={Printer} disabled={!set.data || !format} onClick={() => window.print()}>
          Etiketten drucken
        </Button>
      </div>
      {set.error ? (
        <p className={styles.message}>Satz konnte nicht geladen werden: {set.error.message}</p>
      ) : !set.data || !formats ? (
        <p className={styles.message}>Lade …</p>
      ) : !format ? (
        <p className={styles.message}>
          Noch kein Etikettenformat – in den <Link to="/settings">Einstellungen</Link> unter «Pneuhotel – Etiketten» anlegen.
        </p>
      ) : (
        <Sheet set={set.data} format={format} start={from} />
      )}
    </div>
  )
}

/** The A4 sheet: the labels of the set from the start on, the other places as faint outlines (screen only) */
function Sheet({ set, format, start }: { set: TireSet; format: LabelFormat; start: number }) {
  const size = (spot: { left: number; top: number }): CSSProperties => ({
    left: `${spot.left}mm`,
    top: `${spot.top}mm`,
    width: `${format.widthMm}mm`,
    height: `${format.heightMm}mm`,
  })
  const used = new Set(spotsFrom(format, start).map((s) => s.position))
  return (
    <article className={styles.sheet} aria-label="Etikettenbogen" style={{ fontSize: `${fontSize(format)}mm` }}>
      {spots(format)
        .filter((spot) => !used.has(spot.position))
        .map((spot) => (
          <span key={spot.position} className={styles.empty} style={size(spot)} aria-hidden />
        ))}
      {spotsFrom(format, start).map((spot, index) => {
        const wheel = WHEELS[index]
        return (
          <section key={spot.position} className={styles.label} style={size(spot)} aria-label={`Etikett ${wheel.short}`}>
            <strong className={styles.place}>{set.place ?? 'Platz: ______'}</strong>
            <span className={styles.line}>{ownerLine(set)}</span>
            <span className={styles.wheel}>
              {wheel.short} – {wheel.label}
            </span>
            <span className={styles.line}>
              {/* short – it must fit on the small labels (38 mm) */}
              {SEASONS[set.season]} · {formatDate(set.storedOn)}
            </span>
          </section>
        )
      })}
    </article>
  )
}
