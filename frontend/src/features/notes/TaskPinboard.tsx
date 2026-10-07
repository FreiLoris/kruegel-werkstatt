import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useTodos } from '../todos/todoApi'
import { TaskTodos } from '../todos/TaskTodos'
import { useNotes } from './noteApi'
import styles from './TaskPinboard.module.css'
import { TaskNotes } from './TaskNotes'

/**
 * Everything on the pinboard about a task (8e): its notes and its to-dos in one card – like the
 * pinboard itself. "+ Notiz" or "+ To-do" adds one right here (UI review: no modal in a modal).
 */
export function TaskPinboard({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const [adding, setAdding] = useState<'note' | 'todo' | null>(null)
  // the same queries as the parts below – cached, only to know whether anything is there
  const notes = useNotes({ taskId })
  const open = useTodos({ taskId })
  const done = useTodos({ taskId, done: true })
  const nothing = notes.data?.length === 0 && open.data?.length === 0 && done.data?.length === 0

  return (
    <div className={styles.card}>
      {nothing && adding === null && <p className="muted">Keine Notizen und To-dos zu diesem Auftrag.</p>}
      <TaskNotes taskId={taskId} canEdit={canEdit} adding={adding === 'note'} onAdded={() => setAdding(null)} />
      <TaskTodos taskId={taskId} canEdit={canEdit} adding={adding === 'todo'} onAdded={() => setAdding(null)} />
      {canEdit && adding === null && (
        <div className={styles.add}>
          <Button small icon={Plus} onClick={() => setAdding('note')}>
            Notiz
          </Button>
          <Button small icon={Plus} onClick={() => setAdding('todo')}>
            To-do
          </Button>
        </div>
      )}
    </div>
  )
}
