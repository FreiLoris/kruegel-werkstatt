import { useState } from 'react'
import { useCanEdit } from '../../app/person/useDevicePerson'
import { MasterDataList } from '../../components/masterdata/MasterDataList'
import { NameDialog } from '../../components/masterdata/NameDialog'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirmContext'
import { useToast } from '../../components/ui/toastContext'
import { useAllLifts, useReorderLifts, useSaveLift, useSetLiftActive, type Lift } from './liftApi'

type Dialog = { kind: 'new' } | { kind: 'rename'; lift: Lift } | null

/**
 * Manage lifts: number, names, order (= columns from left to right).
 * Used to be a fixed "Lift 1/2/3" in the code (bug #13). Display: {@link MasterDataList}.
 */
export function LiftSettings() {
  const { data: all, error, isPending, refetch } = useAllLifts()
  const canEdit = useCanEdit()
  const save = useSaveLift()
  const reorder = useReorderLifts()
  const setActive = useSetLiftActive()
  const toast = useToast()
  const confirm = useConfirm()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) return <p className="muted">Lade Lifts …</p>
  if (error) {
    return (
      <>
        <p className="muted">Lifts konnten nicht geladen werden: {error.message}</p>
        <Button onClick={() => void refetch()}>Erneut versuchen</Button>
      </>
    )
  }

  async function decommission(lift: Lift) {
    const ok = await confirm({
      title: `${lift.name} stilllegen?`,
      text: `${lift.name} hat danach keine Spalte mehr und ist bei Terminen nicht mehr wählbar. Unter «Stillgelegt» lässt sich das rückgängig machen.`,
      confirmLabel: 'Stilllegen',
    })
    if (!ok) return
    setActive.mutate(
      { id: lift.id, active: false },
      {
        onSuccess: () => toast.success(`${lift.name} stillgelegt`),
        // e.g. "Mindestens ein Lift muss in Betrieb bleiben."
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <>
      <MasterDataList
        entries={all}
        texts={{
          title: 'Lifts',
          description: 'Reihenfolge von oben nach unten = Spalten von links nach rechts in Tagesansicht und Dashboard.',
          add: 'Lift hinzufügen',
          deactivate: 'Stilllegen',
          inactive: 'Stillgelegt',
          activate: 'Wieder in Betrieb',
        }}
        canEdit={canEdit}
        busy={reorder.isPending || setActive.isPending}
        keepOneActive
        onAdd={() => setDialog({ kind: 'new' })}
        onRename={(lift) => setDialog({ kind: 'rename', lift })}
        onDeactivate={(lift) => void decommission(lift)}
        onActivate={(lift) =>
          setActive.mutate(
            { id: lift.id, active: true },
            {
              onSuccess: () => toast.success(`${lift.name} ist wieder in Betrieb`),
              onError: (error) => toast.error(`${lift.name} konnte nicht aktiviert werden: ${error.message}`),
            },
          )
        }
        onReorder={(ids) => reorder.mutate(ids, { onError: (error) => toast.error(`Reihenfolge nicht gespeichert: ${error.message}`) })}
      />

      {dialog && (
        <NameDialog
          key={dialog.kind === 'new' ? 'new' : dialog.lift.id}
          title={dialog.kind === 'new' ? 'Neuer Lift' : `${dialog.lift.name} umbenennen`}
          initialName={dialog.kind === 'rename' ? dialog.lift.name : undefined}
          placeholder="z. B. Lift 4 oder Grube"
          hint="So heisst die Spalte in Tagesansicht und Dashboard."
          maxLength={30}
          save={(name) => save.mutateAsync(dialog.kind === 'new' ? { name } : { id: dialog.lift.id, name, version: dialog.lift.version })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
