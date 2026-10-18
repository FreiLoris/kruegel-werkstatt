import { Check, Inbox, Package, Wrench, type LucideIcon } from 'lucide-react'
import type { TaskStatus } from './taskApi'

/** A sign per status – color alone was not enough (UX M-12: TV from afar, color-blind) */
const ICONS: Record<TaskStatus, LucideIcon> = {
  RECEIVED: Inbox,
  IN_PROGRESS: Wrench,
  WAITING_FOR_PARTS: Package,
  DONE: Check,
}

export function StatusIcon({ status, className }: { status: TaskStatus; className?: string }) {
  const Icon = ICONS[status]
  return <Icon aria-hidden className={className} />
}
