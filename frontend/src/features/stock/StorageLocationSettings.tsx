import { useState } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { MasterDataList } from '../../components/masterdata/MasterDataList'
import { NameDialog } from '../../components/masterdata/NameDialog'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import {
  useAllStorageLocations,
  useReorderStorageLocations,
  useSaveStorageLocation,
  useSetStorageLocationActive,
  type StorageLocation,
} from './storageLocationApi'

type Dialog = { kind: 'new' } | { kind: 'rename'; location: StorageLocation } | null

/** Where things lie in the workshop (shelf, compartment, …) – for the stock list (FB-08). */
export function StorageLocationSettings() {
  const { data: all, error, isPending, refetch } = useAllStorageLocations()
  const canEdit = useCanEdit()
  const save = useSaveStorageLocation()
  const reorder = useReorderStorageLocations()
  const setActive = useSetStorageLocationActive()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)

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
  function setActiveWithMessage(location: StorageLocation, active: boolean) {
    setActive.mutate(
      { id: location.id, active },
      {
        onSuccess: () => toast.success(active ? `${location.name} wird wieder verwendet` : `${location.name} wird nicht mehr verwendet`),
        onError: (error) => toast.error(`${location.name}: ${error.message}`),
      },
    )
  }

  return (
    <>
      <MasterDataList
        entries={all}
        texts={{
          title: 'Lagerorte',
          description: 'Wo etwas in der Werkstatt liegt, z. B. Regal oder Fach. Reihenfolge = Reihenfolge in der Lagerliste.',
          add: 'Lagerort hinzufügen',
          deactivate: 'Nicht mehr verwenden',
          inactive: 'Nicht mehr verwendet',
          activate: 'Wieder verwenden',
        }}
        canEdit={canEdit}
        busy={reorder.isPending || setActive.isPending}
        onAdd={() => setDialog({ kind: 'new' })}
        onRename={(location) => setDialog({ kind: 'rename', location })}
        onDeactivate={(location) => setActiveWithMessage(location, false)}
        onActivate={(location) => setActiveWithMessage(location, true)}
        onReorder={(ids) => reorder.mutate(ids, { onError: (error) => toast.error(`Reihenfolge nicht gespeichert: ${error.message}`) })}
      />

      {dialog && (
        <NameDialog
          key={dialog.kind === 'new' ? 'new' : dialog.location.id}
          title={dialog.kind === 'new' ? 'Neuer Lagerort' : `${dialog.location.name} umbenennen`}
          initialName={dialog.kind === 'rename' ? dialog.location.name : undefined}
          placeholder="z. B. Regal A, Fach 3"
          hint="So erscheint der Lagerort in der Lagerliste."
          maxLength={40}
          save={(name) =>
            save.mutateAsync(dialog.kind === 'new' ? { name } : { id: dialog.location.id, name, version: dialog.location.version })
          }
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
