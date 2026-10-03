import { useSyncExternalStore } from 'react'
import { useAktiveMitarbeiter } from '../../features/mitarbeiter/mitarbeiterApi'
import { abonnieren, geraetWahl } from '../../lib/geraetPerson'
import { darfAendern, geraetStatus, type GeraetStatus } from './geraetStatus'

/**
 * Wer benutzt dieses Gerät – und darf es ändern?
 *
 * Kombiniert die gespeicherte Wahl (localStorage) mit der aktuellen Mitarbeiterliste.
 * Wird die gewählte Person auf einem anderen Gerät deaktiviert, kommt per Live-Update
 * die neue Liste – und dieses Gerät fragt sofort wieder «Wer bist du?».
 */
export function useGeraetPerson(): GeraetStatus {
  const wahl = useSyncExternalStore(abonnieren, geraetWahl)
  const { data: aktive, isError } = useAktiveMitarbeiter()
  return geraetStatus(wahl, aktive, isError)
}

/**
 * Darf auf diesem Gerät geändert werden? Bearbeiten-Knöpfe nur zeigen, wenn ja.
 *
 *   const darfAendern = useDarfAendern()
 *   {darfAendern && <Button …>Bearbeiten</Button>}
 */
export function useDarfAendern(): boolean {
  return darfAendern(useGeraetPerson())
}
