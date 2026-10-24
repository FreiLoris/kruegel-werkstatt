import { Building2, GraduationCap, Palmtree, Thermometer, UserRoundCheck, type LucideIcon } from 'lucide-react'
import type { AbsenceCategory } from './absenceApi'

const ICONS: Record<AbsenceCategory, LucideIcon> = {
  VACATION: Palmtree,
  SICK: Thermometer,
  EXTERNAL_WORK: Building2,
  TRAINING: GraduationCap,
  PRESENT: UserRoundCheck,
}

/**
 * The symbol of a category – a bar of one day is too short for "Krank", the symbol still says it
 * (and tells "Krank" from "Kurs", which start with the same letter). Only decoration: the text or
 * the tooltip next to it says the category in words.
 */
export function CategoryIcon({ category, className }: { category: AbsenceCategory; className?: string }) {
  const Icon = ICONS[category]
  return <Icon className={className} aria-hidden />
}
