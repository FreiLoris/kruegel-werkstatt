import { ArrowDown, ArrowUp, FolderInput, Pencil, Plus, PowerOff, RotateCcw } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Fields'
import { Menu, MenuItem } from '../../components/ui/Menu'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { moved } from '../../lib/sortOrder'
import { placesWithin, placeTree, type Place } from './placeTree'
import {
  useAllStorageLocations,
  useMoveStorageLocation,
  useReorderStorageLocations,
  useSaveStorageLocation,
  useSetStorageLocationActive,
  type StorageLocation,
} from './storageLocationApi'
import { StorageLocationDialog } from './StorageLocationDialog'
import styles from './StorageLocationSettings.module.css'

type Dialog =
  | { kind: 'new'; parent: StorageLocation | null }
  | { kind: 'rename'; location: StorageLocation }
  | { kind: 'move'; location: StorageLocation }
  | null

/**
 * Where things lie in the workshop – a tree as deep as needed (13f): floor or room › shelf › drawer.
 * Each place: ↑/↓ within its level, "+" for a place inside it, and in "Mehr" rename, move and
 * "no longer use" (with everything inside it).
 */
export function StorageLocationSettings() {
  const { data: all, error, isPending, refetch } = useAllStorageLocations()
  const canEdit = useCanEdit()
  const save = useSaveStorageLocation()
  const reorder = useReorderStorageLocations()
  const setActive = useSetStorageLocationActive()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)
  // FB-23: every code on the premises (also of places no longer in use – their label may still hang there)
  const usedCodes = useMemo(() => (all ?? []).flatMap((l) => (l.code ? [l.code] : [])), [all])
  /** The code a place inside `parentId` shows when it has none – the nearest one above */
  const inheritedCode = (parentId: string | null): string | undefined => {
    const byId = new Map((all ?? []).map((l) => [l.id, l]))
    for (let id = parentId; id; id = byId.get(id)?.parentId ?? null) {
      const code = byId.get(id)?.code
      if (code) return code
    }
    return undefined
  }

  const active = useMemo(() => placeTree((all ?? []).filter((l) => l.active)), [all])
  const inactive = useMemo(() => placeTree(all ?? []).filter((p) => !p.location.active), [all])

  if (isPending) return <p className="muted">Lade Lagerorte …</p>
  if (error) {
    return (
      <>
        <p className="muted">Lagerorte konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  // Without confirmation: articles keep their place, undone with one click
  function setActiveWithMessage(location: StorageLocation, on: boolean) {
    setActive.mutate(
      { id: location.id, active: on },
      {
        onSuccess: () => toast.success(on ? `${location.name} wird wieder verwendet` : `${location.name} wird nicht mehr verwendet`),
        onError: (error) => toast.error(`${location.name}: ${error.message}`),
      },
    )
  }

  /** ↑/↓ among the places with the same parent */
  function move(place: Place, direction: -1 | 1) {
    const siblings = active.filter((p) => p.location.parentId === place.location.parentId).map((p) => p.location.id)
    reorder.mutate(moved(siblings, siblings.indexOf(place.location.id), direction), {
      onError: (error) => toast.error(`Reihenfolge nicht gespeichert: ${error.message}`),
    })
  }

  const busy = reorder.isPending || setActive.isPending

  return (
    <>
      <div className={styles.header}>
        <div>
          <h2>Lagerorte</h2>
          <p className="muted">
            Wo etwas in der Werkstatt liegt – so tief verschachtelt wie nötig, z. B. Stockwerk oder Raum › Regal › Schublade.
          </p>
        </div>
        {canEdit && (
          <Button icon={Plus} onClick={() => setDialog({ kind: 'new', parent: null })}>
            Lagerort hinzufügen
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <p className={styles.empty}>Noch keine Lagerorte.</p>
      ) : (
        <ul className={styles.tree}>
          {active.map((place) => {
            const siblings = active.filter((p) => p.location.parentId === place.location.parentId)
            const index = siblings.indexOf(place)
            const { location } = place
            return (
              <li key={location.id} className={styles.row} style={{ paddingLeft: `calc(var(--space-3) + ${place.depth * 1.5}rem)` }}>
                <span className={styles.name} title={place.path}>
                  {location.code && <span className={styles.code}>{location.code}</span>}
                  {location.name}
                </span>
                {canEdit && (
                  <span className={styles.actions}>
                    <Button
                      variant="ghost"
                      icon={ArrowUp}
                      aria-label={`${location.name} nach oben`}
                      title="Nach oben"
                      disabled={index === 0 || busy}
                      onClick={() => move(place, -1)}
                    />
                    <Button
                      variant="ghost"
                      icon={ArrowDown}
                      aria-label={`${location.name} nach unten`}
                      title="Nach unten"
                      disabled={index === siblings.length - 1 || busy}
                      onClick={() => move(place, 1)}
                    />
                    <Button
                      variant="ghost"
                      icon={Plus}
                      aria-label={`Lagerort in ${location.name} hinzufügen`}
                      title={`Lagerort in ${location.name}`}
                      onClick={() => setDialog({ kind: 'new', parent: location })}
                    />
                    <Menu label="Mehr">
                      <MenuItem icon={Pencil} onClick={() => setDialog({ kind: 'rename', location })}>
                        Bearbeiten (Name, Kürzel)
                      </MenuItem>
                      <MenuItem icon={FolderInput} onClick={() => setDialog({ kind: 'move', location })}>
                        Verschieben
                      </MenuItem>
                      <MenuItem icon={PowerOff} onClick={() => setActiveWithMessage(location, false)}>
                        Nicht mehr verwenden
                      </MenuItem>
                    </Menu>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {inactive.length > 0 && (
        <details className={styles.inactive}>
          <summary>Nicht mehr verwendet ({inactive.length})</summary>
          <ul className={styles.inactiveList}>
            {inactive.map((place) => (
              <li key={place.location.id}>
                <span className="muted">{place.path}</span>
                {/* only where the place around it is in use – otherwise that one first */}
                {canEdit && (!place.location.parentId || all.some((l) => l.id === place.location.parentId && l.active)) && (
                  <Button small icon={RotateCcw} onClick={() => setActiveWithMessage(place.location, true)} disabled={busy}>
                    Wieder verwenden
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog?.kind === 'move' ? (
        <MoveDialog key={dialog.location.id} location={dialog.location} all={all} onClose={() => setDialog(null)} />
      ) : (
        dialog && (
          <StorageLocationDialog
            key={dialog.kind === 'new' ? `new-${dialog.parent?.id}` : dialog.location.id}
            title={
              dialog.kind === 'new'
                ? dialog.parent
                  ? `Neuer Lagerort in ${dialog.parent.name}`
                  : 'Neuer Lagerort'
                : `${dialog.location.name} bearbeiten`
            }
            initial={dialog.kind === 'rename' ? { name: dialog.location.name, code: dialog.location.code } : undefined}
            inheritedCode={inheritedCode(dialog.kind === 'new' ? (dialog.parent?.id ?? null) : dialog.location.parentId)}
            usedCodes={usedCodes}
            placeholder={dialog.kind === 'new' && dialog.parent ? 'z. B. Regal 2, Schublade 3' : 'z. B. Keller, Büro, 1. OG'}
            save={({ name, code }) =>
              save.mutateAsync(
                dialog.kind === 'new'
                  ? { name, code, parentId: dialog.parent?.id ?? null }
                  : { id: dialog.location.id, name, code, version: dialog.location.version },
              )
            }
            onClose={() => setDialog(null)}
          />
        )
      )}
    </>
  )
}

const TOP = ''

/** Into another place or to the top level – not into itself or one of its own places. */
function MoveDialog({ location, all, onClose }: { location: StorageLocation; all: StorageLocation[]; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const moveLocation = useMoveStorageLocation()
  const [target, setTarget] = useState(location.parentId ?? TOP)

  const inside = placesWithin(all).get(location.id) ?? new Set([location.id])
  const targets = placeTree(all.filter((l) => l.active)).filter((p) => !inside.has(p.location.id))

  function submit(event: FormEvent) {
    event.preventDefault()
    moveLocation.mutate(
      { id: location.id, parentId: target === TOP ? null : target },
      {
        onSuccess: () => {
          toast.success(`${location.name} verschoben`)
          onClose()
        },
        onError: (error) => toast.error(`${location.name} nicht verschoben: ${error.message}`),
      },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${location.name} verschieben`}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" type="submit" form={formId} loading={moveLocation.isPending}>
            Verschieben
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Select label="Neu in" hint="Alles, was darin liegt, kommt mit." value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value={TOP}>– oberste Ebene –</option>
          {targets.map((p) => (
            <option key={p.location.id} value={p.location.id}>
              {p.path}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  )
}
