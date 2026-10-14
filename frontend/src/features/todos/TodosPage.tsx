import { TodoListView } from './TodoListView'

/** The to-dos – a page of its own since FB-04 (before: a view of the pinboard) */
export function TodosPage() {
  return <TodoListView shopping={false} />
}
