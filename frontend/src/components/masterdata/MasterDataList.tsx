import { ArrowDown, ArrowUp, Pencil, Plus, PowerOff, RotateCcw } from 'lucide-react'
import { moved } from '../../lib/sortOrder'
import { Button } from '../ui/Button'
import styles from './MasterDataList.module.css'

/** What every entry needs (lift, service item, …). */
export interface MasterDataEntry {
  id: string
  name: string
  active: boolean
}

/** The visible (German) texts of the list. */
export interface MasterDataListTexts {
  title: string
  description: string
  /** e.g. "Lift hinzufügen" */
  add: string
  /** e.g. "Stilllegen" / "Nicht mehr anbieten" */
  deactivate: string
  /** Heading of the collapsed list, e.g. "Stillgelegt" */
  inactive: string
  /** e.g. "Wieder in Betrieb" / "Wieder anbieten" */
  activate: string
}

interface MasterDataListProps<T extends MasterDataEntry> {
  /** All entries in fixed order, active and inactive */
  entries: T[]
  texts: MasterDataListTexts
  /** No in view-only mode → no buttons */
  canEdit: boolean
  /** Is a change running? → briefly disable the buttons (no double click) */
  busy: boolean
  /** The last active entry must not be deactivated (e.g. lifts) */
  keepOneActive?: boolean
  onAdd: () => void
  onRename: (entry: T) => void
  onDeactivate: (entry: T) => void
  onActivate: (entry: T) => void
  /** New order of the active entries (IDs, first = top) */
  onReorder: (ids: string[]) => void
}

/**
 * Simple master data with a name and fixed order: list with ↑/↓, rename,
 * deactivate and collapsed inactive entries. Display only – saving, confirmations and
 * messages are done by the caller (e.g. `LiftSettings`).
 */
export function MasterDataList<T extends MasterDataEntry>({
  entries,
  texts,
  canEdit,
  busy,
  keepOneActive = false,
  onAdd,
  onRename,
  onDeactivate,
  onActivate,
  onReorder,
}: MasterDataListProps<T>) {
  const active = entries.filter((e) => e.active)
  const inactive = entries.filter((e) => !e.active)
  const lastOneProtected = keepOneActive && active.length <= 1

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>{texts.title}</h2>
          <p className="muted">{texts.description}</p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={onAdd}>
            {texts.add}
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>Keine Einträge.</p>
      ) : (
        <ol className={styles.list}>
          {active.map((entry, index) => (
            <li key={entry.id} className={styles.row}>
              <span className={styles.number} aria-hidden>
                {index + 1}
              </span>
              <span className={styles.name}>{entry.name}</span>
              {canEdit && (
                <span className={styles.actions}>
                  <Button
                    variant="ghost"
                    icon={ArrowUp}
                    aria-label={`${entry.name} nach oben`}
                    title="Nach oben"
                    disabled={index === 0 || busy}
                    onClick={() => onReorder(moved(active.map((e) => e.id), index, -1))}
                  />
                  <Button
                    variant="ghost"
                    icon={ArrowDown}
                    aria-label={`${entry.name} nach unten`}
                    title="Nach unten"
                    disabled={index === active.length - 1 || busy}
                    onClick={() => onReorder(moved(active.map((e) => e.id), index, 1))}
                  />
                  <Button variant="ghost" icon={Pencil} onClick={() => onRename(entry)} aria-label={`${entry.name} umbenennen`}>
                    Umbenennen
                  </Button>
                  <Button
                    variant="ghost"
                    icon={PowerOff}
                    onClick={() => onDeactivate(entry)}
                    // The backend would reject it – do not offer the button at all
                    disabled={lastOneProtected || busy}
                    title={lastOneProtected ? 'Mindestens einer muss aktiv bleiben' : undefined}
                    aria-label={`${entry.name}: ${texts.deactivate}`}
                  >
                    {texts.deactivate}
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {inactive.length > 0 && (
        <details className={styles.inactive}>
          <summary>
            {texts.inactive} ({inactive.length})
          </summary>
          <ul className={styles.inactiveList}>
            {inactive.map((entry) => (
              <li key={entry.id}>
                <span className="muted">{entry.name}</span>
                {canEdit && (
                  <Button small icon={RotateCcw} onClick={() => onActivate(entry)} disabled={busy}>
                    {texts.activate}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}
