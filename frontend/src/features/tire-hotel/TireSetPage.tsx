import { ArrowLeft, FileText, LogOut, MapPin, Pencil, Ruler, Tag } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, reasonOf } from '../../api/errors'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { Facts } from '../../components/ui/Facts'
import { useToast } from '../../components/ui/toastContext'
import { formatDate } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { MeasureDialog } from './MeasureDialog'
import { MoveDialog } from './MoveDialog'
import {
  KINDS,
  RIMS,
  SEASONS,
  useRetrieveTireSet,
  useTireSet,
  useTireSetHistory,
  useTreadLimits,
  type TireSet,
  type TireSetEvent,
} from './tireHotelApi'
import styles from './TireHotel.module.css'
import { formatDepth, olderDepths, WHEELS } from './tread'
import { AdviseBanner, TreadDepthsView } from './TreadDepthsView'

const EVENT_TEXT: Record<TireSetEvent['kind'], string> = {
  STORED: 'Eingelagert',
  MEASURED: 'Nachgemessen',
  MOVED: 'Umgelagert',
  RETRIEVED: 'Ausgelagert',
}

/** "auf OG-B3-1", "nach OG-B3-2", "von OG-B3-2" – the place of a step in words */
function placeOf(event: TireSetEvent): string | null {
  if (!event.place) return null
  switch (event.kind) {
    case 'MOVED':
      return `nach ${event.place}`
    case 'RETRIEVED':
      return `von ${event.place}`
    default:
      return `auf ${event.place}`
  }
}

/** One set of the tyre hotel (FB-07): its data, the depths around the car, and the history of the wear. */
export function TireSetPage() {
  const { id } = useParams()
  const set = useTireSet(id)
  // the data wins over a failed background refetch – open measure/move dialogs keep their input;
  // only "not found" (deleted on another device) replaces the page
  const deleted = set.error instanceof ApiError && set.error.problem.status === 404
  if (!set.data || deleted) return <p className="muted">{set.error ? `Satz konnte nicht geladen werden: ${set.error.message}` : 'Lade …'}</p>
  return <TireSetDetail set={set.data} />
}

function TireSetDetail({ set }: { set: TireSet }) {
  const { data: limits } = useTreadLimits()
  const history = useTireSetHistory(set.id)
  const { data: employees } = useAllEmployees()
  const canEdit = useCanEdit()
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()
  const retrieve = useRetrieveTireSet()
  const [dialog, setDialog] = useState<'measure' | 'move' | null>(null)
  const inHotel = !set.retrievedOn
  const v = set.vehicle

  async function retrieveSet() {
    const ok = await confirm({
      title: 'Satz auslagern?',
      text: `Der Satz von ${set.customer.displayName} verlässt heute das Pneuhotel. Er bleibt mit seinem Verlauf unter «Ausgelagert».`,
      confirmLabel: 'Auslagern',
    })
    if (!ok) return
    retrieve.mutate(
      // today – the server's day
      { id: set.id },
      {
        onSuccess: () => toast.success(`Satz von ${set.customer.displayName} ausgelagert`),
        onError: (error) => toast.error(`Nicht ausgelagert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <>
      <p>
        <Link to={inHotel ? '/tires' : '/tires?view=retrieved'}>
          <ArrowLeft aria-hidden size={16} /> Zum Pneuhotel
        </Link>
      </p>
      <div className={styles.header}>
        <div>
          <h1>{set.customer.displayName}</h1>
          <p className={styles.nowrap}>
            {v ? (
              <>
                {v.licensePlate && <LicensePlate text={v.licensePlate} size="sm" />} {v.description}
              </>
            ) : (
              <span className="muted">Fahrzeug noch offen</span>
            )}
          </p>
        </div>
        {canEdit && (
          <div className={styles.actions}>
            {inHotel && (
              <>
                <Button icon={Tag} onClick={() => navigate(`/tires/${set.id}/labels`)}>
                  Etiketten
                </Button>
                <Button icon={FileText} onClick={() => navigate(`/tires/${set.id}/receipt`)}>
                  Einlagerungsschein
                </Button>
              </>
            )}
            <Button icon={Pencil} onClick={() => navigate(`/tires/${set.id}/edit`)}>
              Bearbeiten
            </Button>
            {inHotel && (
              <>
                <Button icon={MapPin} onClick={() => setDialog('move')}>
                  {set.place ? 'Umlagern' : 'Platz zuweisen'}
                </Button>
                <Button icon={Ruler} onClick={() => setDialog('measure')}>
                  Nachmessen
                </Button>
                <Button variant="primary" icon={LogOut} onClick={retrieveSet} loading={retrieve.isPending}>
                  Auslagern
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {!inHotel && set.retrievedOn && <p className={styles.retrieved}>Ausgelagert am {formatDate(set.retrievedOn)}.</p>}

      <div className={styles.columns}>
        <section className={styles.section} aria-labelledby="set-title">
          <h2 id="set-title">Satz</h2>
          <Facts
            rows={[
              ['Saison', SEASONS[set.season]],
              ['Typ', KINDS[set.kind]],
              ['Felgen', set.rims ? RIMS[set.rims] : null],
              ['Dabei', [set.hubCaps && 'Radkappen', set.wheelBolts && 'Radschrauben'].filter(Boolean).join(', ') || null],
              ['Reifen', [set.brand, set.model].filter(Boolean).join(' ') || null],
              ['Dimension', set.dimension],
              ['Jahrgang', set.year?.toString()],
              ['Bemerkung', set.remark],
              ['Eingelagert', formatDate(set.storedOn)],
              // a retrieved set has none
              ['Lagerplatz', inHotel ? (set.place ?? 'noch nicht zugewiesen') : null],
            ]}
          />
        </section>
        <section className={styles.section} aria-labelledby="tread-title">
          <h2 id="tread-title">Profiltiefe</h2>
          {limits && (
            <>
              <TreadDepthsView depths={set.depths} season={set.season} limits={limits} />
              {/* a partial measurement keeps the other wheels – say which ones are older */}
              {olderDepths(history.data ?? []).map(({ wheels, on }) => (
                <p key={on} className="muted">
                  Nicht neu gemessen: {wheels.join(', ')} – Wert vom {formatDate(on)}
                </p>
              ))}
              <AdviseBanner depths={set.depths} season={set.season} limits={limits} />
            </>
          )}
        </section>
        <section className={styles.section} aria-labelledby="history-title">
          <h2 id="history-title">Verlauf</h2>
          {history.data ? (
            <ol className={styles.history}>
              {[...history.data].reverse().map((event) => (
                <li key={event.id}>
                  <span>
                    <strong>{EVENT_TEXT[event.kind]}</strong> am {formatDate(event.happenedOn)}
                    {placeOf(event) && ` ${placeOf(event)}`}
                    {event.createdBy && <span className="muted"> · {employees?.find((e) => e.id === event.createdBy)?.name}</span>}
                  </span>
                  {/* the wear over the seasons – nothing when nothing was measured */}
                  {WHEELS.some((w) => event.depths[w.key] != null) && (
                    <span className="muted">{WHEELS.map((w) => `${w.short} ${formatDepth(event.depths[w.key])}`).join(' · ')}</span>
                  )}
                  {event.note && <span>{event.note}</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Lade …</p>
          )}
        </section>
      </div>

      {dialog === 'measure' && <MeasureDialog set={set} onClose={() => setDialog(null)} />}
      {dialog === 'move' && <MoveDialog set={set} onClose={() => setDialog(null)} />}
    </>
  )
}
