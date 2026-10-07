import { isWeekend, mondayOf } from '../../lib/calendar'
import { addDays } from '../../lib/format'

/**
 * Which week the dashboard shows: this one on working days – on Saturday and Sunday already the
 * coming one (the TV runs over the weekend; on Monday morning the past week is of no use).
 */
export function dashboardMonday(today: string): string {
  return isWeekend(today) ? addDays(mondayOf(today), 7) : mondayOf(today)
}
