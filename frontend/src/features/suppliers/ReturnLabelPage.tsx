import { ArrowLeft, History, Printer } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Select, TextField } from '../../components/ui/Fields'
import { useCompany, type Company } from '../company/companyApi'
import { useAddShoppingNote, useShoppingItem } from '../shopping/shoppingApi'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { useToast } from '../../components/ui/toastContext'
import { spots, spotsFrom, startPositions } from '../tire-hotel/labelSheet'
import { useLabelFormats, type LabelFormat } from '../tire-hotel/tireHotelApi'
import {
  detailLines,
  EMPTY_RETURN,
  hasRecipientAddress,
  isSmallLabel,
  labelFontSize,
  recipientLines,
  RETURN_REASONS,
  returnNote,
  senderLines,
  type ReturnDetails,
} from './returnLabel'
import styles from './ReturnLabelPage.module.css'
import { useSuppliers, type Supplier } from './supplierApi'

/** A whole page for the parcel – or one label of a sheet from the settings */
type Paper = { kind: 'page'; size: 'A5' | 'A4' } | { kind: 'sheet'; formatId: string }

/** The device remembers its paper – the same pack lies next to the printer */
const PAPER_KEY = 'returnLabel.paper'

function rememberedPaper(): Paper {
  try {
    const value = localStorage.getItem(PAPER_KEY)
    if (value === 'A4' || value === 'A5') return { kind: 'page', size: value }
    if (value) return { kind: 'sheet', formatId: value }
  } catch {
    // private window
  }
  return { kind: 'page', size: 'A5' }
}

const paperValue = (paper: Paper) => (paper.kind === 'page' ? paper.size : paper.formatId)

/**
 * A return label for a supplier (FB-31): to its return address (else its own), from us with our
 * customer number, with RMA, delivery note or invoice, article and reason – all optional. On a
 * whole A5 or A4 page for the parcel, or on one label of a sheet (start position as for the tyre
 * labels). From a position of the shopping list (`?item=`) its article and number come along.
 * Outside the app frame, so only the paper is printed.
 */
export function ReturnLabelPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const suppliers = useSuppliers()
  const company = useCompany()
  const formats = useLabelFormats()
  const item = useShoppingItem(search.get('item') ?? undefined)
  const supplier = suppliers.data?.find((s) => s.id === id)
  const canEdit = useCanEdit()
  const toast = useToast()
  const addNote = useAddShoppingNote()
  // noted once – a second click would note it twice
  const [noted, setNoted] = useState(false)

  const [paper, setPaper] = useState<Paper>(rememberedPaper)
  const [start, setStart] = useState(1)
  // the article of the position as a suggestion – typed over freely
  const [typed, setTyped] = useState<Partial<ReturnDetails>>({})
  const details: ReturnDetails = {
    ...EMPTY_RETURN,
    article: item.data?.description ?? '',
    articleNumber: item.data?.partNumber ?? '',
    ...typed,
  }
  const set = (field: keyof ReturnDetails, value: string) => setTyped({ ...typed, [field]: value })

  // a sheet deleted in the settings: back to the A5 page
  const format = paper.kind === 'sheet' ? formats.data?.find((f) => f.id === paper.formatId) : undefined
  const pageSize = paper.kind === 'page' ? paper.size : 'A5'
  const starts = format ? startPositions(format, 1) : []
  const back = item.data ? `/shopping/${item.data.id}` : '/suppliers'

  return (
    <div className={styles.desk}>
      <div className={styles.toolbar}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(back)}>
          Zurück
        </Button>
        <Select
          label="Papier"
          value={format ? format.id : pageSize}
          onChange={(e) => {
            const value = e.target.value
            const next: Paper = value === 'A5' || value === 'A4' ? { kind: 'page', size: value } : { kind: 'sheet', formatId: value }
            setPaper(next)
            setStart(1)
            try {
              localStorage.setItem(PAPER_KEY, paperValue(next))
            } catch {
              // private window: chosen again next time
            }
          }}
        >
          <option value="A5">A5 ganze Seite (Paket)</option>
          <option value="A4">A4 ganze Seite</option>
          {formats.data?.map((f) => (
            <option key={f.id} value={f.id}>
              Etikett: {f.name}
            </option>
          ))}
        </Select>
        {format && (
          <Select label="Etikett Nr. (angebrochener Bogen)" value={String(start)} onChange={(e) => setStart(Number(e.target.value))}>
            {starts.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        )}
        <Button variant="primary" icon={Printer} disabled={!supplier || !company.data} onClick={() => window.print()}>
          Drucken
        </Button>
        {/* FB-31: the return in the history of the position – what goes back, why, under which number */}
        {item.data && supplier && canEdit && (
          <Button
            icon={History}
            disabled={noted}
            loading={addNote.isPending}
            onClick={() =>
              addNote.mutate(
                { id: item.data!.id, text: returnNote(supplier.name, details) },
                {
                  onSuccess: () => {
                    setNoted(true)
                    toast.success('Retour im Verlauf der Position vermerkt')
                  },
                  onError: (error) => toast.error(`Nicht vermerkt: ${error.message}`),
                },
              )
            }
          >
            {noted ? 'Im Verlauf vermerkt' : 'Im Verlauf vermerken'}
          </Button>
        )}
      </div>
      <div className={styles.fields}>
        <TextField label="RMA- / Rücksende-Nr." maxLength={40} value={details.rmaNumber} onChange={(e) => set('rmaNumber', e.target.value)} />
        <TextField label="Lieferschein / Rechnung" maxLength={40} value={details.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} />
        <TextField label="Artikel" maxLength={80} value={details.article} onChange={(e) => set('article', e.target.value)} />
        <TextField label="Nummer" maxLength={40} value={details.articleNumber} onChange={(e) => set('articleNumber', e.target.value)} />
        <Select label="Grund" value={details.reason} onChange={(e) => set('reason', e.target.value)}>
          <option value="">–</option>
          {RETURN_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </Select>
      </div>

      {suppliers.error || company.error ? (
        <p className={styles.message}>Konnte nicht geladen werden: {(suppliers.error ?? company.error)?.message}</p>
      ) : !suppliers.data || !company.data ? (
        <p className={styles.message}>Lade …</p>
      ) : !supplier ? (
        <p className={styles.message}>Diesen Lieferanten gibt es nicht (mehr).</p>
      ) : (
        <>
          {!hasRecipientAddress(supplier) && (
            <p className={styles.warning} role="alert">
              Für {supplier.name} ist keine Adresse erfasst – unter <Link to="/suppliers">Lieferanten</Link> beim Bearbeiten ergänzen.
            </p>
          )}
          {format ? (
            <LabelSheet format={format} start={start} onPickStart={setStart}>
              <Label supplier={supplier} company={company.data} details={details} small={isSmallLabel(Number(format.heightMm))} />
            </LabelSheet>
          ) : (
            <article className={pageSize === 'A4' ? styles.a4 : styles.a5} aria-label="Rücksende-Etikett">
              <Label supplier={supplier} company={company.data} details={details} />
            </article>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Recipient big, sender small above it, the details below – the same on a page and on a label. A
 * small label has room for sender and recipient only (no captions, no details).
 */
function Label({ supplier, company, details, small = false }: { supplier: Supplier; company: Company; details: ReturnDetails; small?: boolean }) {
  const lines = small ? [] : detailLines(details)
  return (
    <div className={styles.label}>
      <p className={styles.sender}>
        {!small && <span className={styles.caption}>Absender</span>}
        {senderLines(company, supplier.customerNumber).join(' · ')}
      </p>
      <p className={styles.recipient}>
        {!small && <span className={styles.caption}>Empfänger</span>}
        {recipientLines(supplier).map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </p>
      {lines.length > 0 && (
        <p className={styles.details}>
          <span className={styles.caption}>Rücksendung</span>
          {lines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </p>
      )}
    </div>
  )
}

/** One label of an A4 sheet from the settings: the start position tapped or chosen, the others faint */
function LabelSheet({ format, start, onPickStart, children }: { format: LabelFormat; start: number; onPickStart: (n: number) => void; children: React.ReactNode }) {
  const size = (spot: { left: number; top: number }): CSSProperties => ({
    left: `${spot.left}mm`,
    top: `${spot.top}mm`,
    width: `${format.widthMm}mm`,
    height: `${format.heightMm}mm`,
  })
  const [spot] = spotsFrom(format, start, 1)
  return (
    <article className={styles.sheet} aria-label="Etikettenbogen" style={{ fontSize: `${labelFontSize(Number(format.heightMm), Number(format.widthMm))}mm` }}>
      {spots(format)
        .filter((s) => s.position !== start)
        .map((s) => (
          <button key={s.position} type="button" className={styles.empty} style={size(s)} onClick={() => onPickStart(s.position)} aria-label={`Auf Etikett ${s.position} drucken`}>
            {s.position}
          </button>
        ))}
      {spot && (
        <section className={styles.onSheet} style={size(spot)}>
          {children}
        </section>
      )}
    </article>
  )
}
