import { CalendarPlus, CheckCheck, Undo2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { reasonOf } from '../../api/errors'
import { LicensePlate } from '../../components/licenseplate/LicensePlate'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Modal } from '../../components/ui/Modal'
import { PhoneLinks } from '../../components/ui/PhoneLinks'
import { useToast } from '../../components/ui/toastContext'
import { useToday } from '../../lib/clock'
import { formatDate, formatTimestamp } from '../../lib/format'
import { useAllEmployees } from '../employees/employeeApi'
import { tireAppointmentUrl } from '../tasks/wizard/tireAppointment'
import { byGroup, counters, daysUntil, groupTitle, seasonTitle } from './seasonChange'
import { KINDS, SEASONS, type TreadLimits } from './tireHotelApi'
import styles from './TireHotel.module.css'
import { searchTireSets } from './tireSetSearch'
import { useAcknowledge, useSeasonChange, useUndoAcknowledge, type SeasonEntry } from './tireSeasonApi'
import { formatDepth, lowestDepth, worstStatus } from './tread'
import { TreadChip } from './TreadDepthsView'

/** The usual reason, one tap (FB-21) */
const QUICK_REASON = 'Fährt Reifen herunter'

interface SeasonChangeViewProps {
  /** the search of the tyre hotel */
  query: string
  limits?: TreadLimits
  canEdit: boolean
}

/**
 * "Saisonwechsel" (FB-21): who changed this season, who has an appointment, who still has to be
 * called – the ones to call first. "Gewechselt" is folded: it only grows.
 */
export function SeasonChangeView({ query, limits, canEdit }: SeasonChangeViewProps) {
  const change = useSeasonChange()
  const today = useToday()
  const [acknowledging, setAcknowledging] = useState<SeasonEntry | null>(null)

  if (change.error) return <p className="muted">Saisonwechsel konnte nicht geladen werden: {change.error.message}</p>
  if (!change.data) return <p className="muted">Lade …</p>

  const season = change.data
  const matching = new Set(searchTireSets(season.entries.map((e) => e.set), query).map((s) => s.id))
  const entries = season.entries.filter((e) => matching.has(e.set.id))
  const days = daysUntil(season.deadline, today)

  return (
    <>
      <h2 className={styles.seasonTitle}>{seasonTitle(season)}</h2>
      <p className={styles.summary}>{counters(season)}</p>
      <p className={season.overdue ? styles.overdue : 'muted'}>
        Stichtag {formatDate(season.deadline)}
        {season.overdue
          ? ' ist vorbei – wer jetzt noch offen ist, hat den Wechsel vergessen.'
          : days === 0
            ? ' ist heute.'
            : ` – noch ${days} ${days === 1 ? 'Tag' : 'Tage'}.`}{' '}
        Gewechselt zählt ab {formatDate(season.from)}. Ganzjahressätze sind nicht dabei.
      </p>
      {entries.length === 0 ? (
        <p className={styles.empty}>{season.entries.length > 0 ? 'Nichts gefunden.' : 'Keine Sätze für diese Saison.'}</p>
      ) : (
        byGroup(entries).map(({ group, entries: inGroup }) => {
          const list = (
            <ul className={styles.seasonList}>
              {inGroup.map((entry) => (
                <SeasonRow key={`${entry.group}-${entry.set.id}`} entry={entry} limits={limits} canEdit={canEdit} onAcknowledge={() => setAcknowledging(entry)} />
              ))}
            </ul>
          )
          const title = `${groupTitle(group, season.overdue)} (${inGroup.length})`
          return group === 'CHANGED' ? (
            <details key={group} className={styles.seasonGroup}>
              <summary>
                <h3>{title}</h3>
              </summary>
              {list}
            </details>
          ) : (
            <section key={group} className={styles.seasonGroup} aria-label={title}>
              <h3 className={group === 'OPEN' && season.overdue ? styles.overdue : undefined}>{title}</h3>
              {list}
            </section>
          )
        })
      )}
      {acknowledging && <AcknowledgeDialog entry={acknowledging} deadline={season.deadline} onClose={() => setAcknowledging(null)} />}
    </>
  )
}

function SeasonRow({
  entry,
  limits,
  canEdit,
  onAcknowledge,
}: {
  entry: SeasonEntry
  limits?: TreadLimits
  canEdit: boolean
  onAcknowledge: () => void
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const undo = useUndoAcknowledge()
  const { data: employees } = useAllEmployees()
  const { set } = entry
  const toCall = entry.group === 'OPEN' || entry.group === 'LONG_STORED'

  function undoAcknowledge(id: string) {
    undo.mutate(id, { onError: (error) => toast.error(`Nicht rückgängig gemacht: ${reasonOf(error)}`) })
  }

  return (
    <li className={styles.seasonRow}>
      <div className={styles.owner}>
        <Link to={`/tires/${set.id}`}>{set.customer.displayName}</Link>
        <span className={styles.sub}>
          {set.vehicle ? (
            <>
              {set.vehicle.licensePlate && <LicensePlate text={set.vehicle.licensePlate} size="sm" />} {set.vehicle.description}
            </>
          ) : (
            <span className="muted">Fahrzeug noch offen</span>
          )}
        </span>
      </div>
      <div className={styles.setCell}>
        {SEASONS[set.season]} · {KINDS[set.kind]}
        <span className={styles.sub}>
          {set.place ?? (set.state === 'IN_HOTEL' ? 'ohne Platz' : '')}
          {set.storedOn && entry.group !== 'CHANGED' && ` · seit ${formatDate(set.storedOn)}`}
        </span>
      </div>
      <div className={styles.depth}>
        <span className={styles.nowrap}>{formatDepth(lowestDepth(set.depths))}</span>{' '}
        {limits && <TreadChip status={worstStatus(set.depths, set.season, limits)} />}
      </div>
      <div className={styles.seasonState}>
        {entry.bothStored && <span className={styles.check}>Beide Sätze eingelagert – prüfen</span>}
        {entry.group === 'CHANGED' && entry.changedOn && <span>Gewechselt am {formatDate(entry.changedOn)}</span>}
        {entry.planned && (
          <span>
            <Link to={`/tasks/${entry.planned.id}`}>{entry.planned.taskNumber ?? 'Auftrag'}</Link>{' '}
            {entry.planned.date ? `am ${formatDate(entry.planned.date)}` : '· noch ohne Termin'}
          </span>
        )}
        {entry.ack && (
          <span>
            Quittiert {formatTimestamp(entry.ack.at)}
            {entry.ack.by && ` von ${employees?.find((e) => e.id === entry.ack!.by)?.name ?? '…'}`}
            {entry.ack.reason && ` – «${entry.ack.reason}»`}
          </span>
        )}
        {toCall && <PhoneLinks mobile={set.customer.mobile} phone={set.customer.phone} />}
      </div>
      {canEdit && (
        <div className={styles.seasonActions}>
          {toCall && (
            <>
              <Button small icon={CalendarPlus} onClick={() => navigate(tireAppointmentUrl(set.id))}>
                Termin abmachen
              </Button>
              <Button small icon={CheckCheck} onClick={onAcknowledge} aria-label={`Quittieren: ${set.customer.displayName}, ${SEASONS[set.season]}`}>
                Quittieren
              </Button>
            </>
          )}
          {entry.ack && (
            <Button small icon={Undo2} loading={undo.isPending} onClick={() => undoAcknowledge(entry.ack!.id)} aria-label={`Quittierung rückgängig: ${set.customer.displayName}`}>
              Rückgängig
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

/** "Quittieren" with an optional reason – for the season shown only (FB-21) */
function AcknowledgeDialog({ entry, deadline, onClose }: { entry: SeasonEntry; deadline: string; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const acknowledge = useAcknowledge()
  const [reason, setReason] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    acknowledge.mutate(
      { tireSetId: entry.set.id, deadline, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${entry.set.customer.displayName} quittiert`)
          onClose()
        },
        onError: (error) => toast.error(`Nicht quittiert: ${reasonOf(error)}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Quittieren"
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={acknowledge.isPending}>
            Quittieren
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.dialogBody} onSubmit={submit}>
        <p>
          {entry.set.customer.displayName} · {SEASONS[entry.set.season]}: wird in dieser Saison nicht gewechselt. Nächste Saison erscheint der
          Satz wieder.
        </p>
        <TextField label="Grund (optional)" maxLength={200} autoComplete="off" value={reason} onChange={(e) => setReason(e.target.value)} />
        <p>
          <Button small onClick={() => setReason(QUICK_REASON)}>
            {QUICK_REASON}
          </Button>
        </p>
      </form>
    </Modal>
  )
}
