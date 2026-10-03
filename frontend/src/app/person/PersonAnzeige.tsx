import { Eye, UserRound, UsersRound } from 'lucide-react'
import { Menue, MenueEintrag } from '../../components/ui/Menue'
import { wahlZuruecksetzen } from '../../lib/geraetPerson'
import type { GeraetStatus } from './geraetStatus'

/**
 * In der Kopfzeile: wer das Gerät gerade benutzt. Über das Menü lässt sich wechseln
 * (z. B. Tablet geht an eine andere Person weiter).
 */
export function PersonAnzeige({ status }: { status: GeraetStatus }) {
  if (status.art !== 'person' && status.art !== 'ansehen') {
    return null
  }
  return (
    <Menue label={status.art === 'person' ? status.person.name : 'Nur ansehen'} icon={status.art === 'person' ? UserRound : Eye}>
      <MenueEintrag icon={UsersRound} onClick={wahlZuruecksetzen}>
        Person wechseln
      </MenueEintrag>
    </Menue>
  )
}
