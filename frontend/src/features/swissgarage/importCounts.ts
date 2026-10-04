import { formatCount } from '../../lib/format'
import type { ImportRun } from './swissGarageApi'

/** "12 neu · 30 geändert · …" – only the numbers that are not 0. */
export function countsText(run: Pick<ImportRun, 'created' | 'updated' | 'unchanged' | 'deactivated' | 'skipped'>): string {
  const parts: [number, string][] = [
    [run.created, 'neu'],
    [run.updated, 'geändert'],
    [run.unchanged, 'unverändert'],
    [run.deactivated, 'deaktiviert'],
    [run.skipped, 'übersprungen'],
  ]
  const text = parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${formatCount(count)} ${label}`)
    .join(' · ')
  return text || 'keine Einträge'
}
