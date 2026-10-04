import { useState } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { MasterDataList } from '../../components/masterdata/MasterDataList'
import { NameDialog } from '../../components/masterdata/NameDialog'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toastContext'
import {
  useAllServiceItems,
  useReorderServiceItems,
  useSaveServiceItem,
  useSetServiceItemActive,
  type ServiceItem,
} from './serviceItemApi'

type Dialog = { kind: 'new' } | { kind: 'rename'; item: ServiceItem } | null

/**
 * Manage service items (Ölwechsel, Wischblätter, …) – used to be 8 fixed checkboxes.
 * Display: {@link MasterDataList}.
 */
export function ServiceItemSettings() {
  const { data: all, error, isPending, refetch } = useAllServiceItems()
  const canEdit = useCanEdit()
  const save = useSaveServiceItem()
  const reorder = useReorderServiceItems()
  const setActive = useSetServiceItemActive()
  const toast = useToast()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="muted">Lade Serviceleistungen …</p>
  if (error) {
    return (
      <>
        <p className="muted">Serviceleistungen konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  // Without confirmation: harmless and undone with one click under "Nicht mehr angeboten"
  function setActiveWithMessage(item: ServiceItem, active: boolean) {
    setActive.mutate(
      { id: item.id, active },
      {
        onSuccess: () => toast.success(active ? `${item.name} wird wieder angeboten` : `${item.name} wird nicht mehr angeboten`),
        onError: (error) => toast.error(`${item.name}: ${error.message}`),
      },
    )
  }

  return (
    <>
      <MasterDataList
        entries={all}
        texts={{
          title: 'Serviceleistungen',
          description: 'Zum Ankreuzen beim Service. Reihenfolge = Reihenfolge im Auftrag und auf dem Auftragszettel.',
          add: 'Leistung hinzufügen',
          deactivate: 'Nicht mehr anbieten',
          inactive: 'Nicht mehr angeboten',
          activate: 'Wieder anbieten',
        }}
        canEdit={canEdit}
        busy={reorder.isPending || setActive.isPending}
        onAdd={() => setDialog({ kind: 'new' })}
        onRename={(item) => setDialog({ kind: 'rename', item })}
        onDeactivate={(item) => setActiveWithMessage(item, false)}
        onActivate={(item) => setActiveWithMessage(item, true)}
        onReorder={(ids) => reorder.mutate(ids, { onError: (error) => toast.error(`Reihenfolge nicht gespeichert: ${error.message}`) })}
      />

      {dialog && (
        <NameDialog
          key={dialog.kind === 'new' ? 'new' : dialog.item.id}
          title={dialog.kind === 'new' ? 'Neue Serviceleistung' : `${dialog.item.name} umbenennen`}
          initialName={dialog.kind === 'rename' ? dialog.item.name : undefined}
          placeholder="z. B. Reifen einlagern"
          hint="So erscheint die Leistung als Checkbox im Auftrag."
          maxLength={40}
          save={(name) => save.mutateAsync(dialog.kind === 'new' ? { name } : { id: dialog.item.id, name, version: dialog.item.version })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
