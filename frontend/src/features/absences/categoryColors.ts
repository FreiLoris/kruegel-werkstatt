import type { AbsenceCategory } from './absenceApi'
import styles from './categoryColors.module.css'

/** Class that sets `--absence-color` for a category (9b: four clearly different colors, not four times brown) */
export const CATEGORY_CLASS: Record<AbsenceCategory, string> = {
  VACATION: styles.vacation,
  SICK: styles.sick,
  EXTERNAL_WORK: styles.external,
  TRAINING: styles.training,
}
