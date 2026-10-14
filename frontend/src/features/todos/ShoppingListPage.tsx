import { MaterialTabs } from '../stock/MaterialTabs'
import { TodoListView } from './TodoListView'

/** The shopping list – a page of its own since FB-04, a tab under "Material" since FB-08 */
export function ShoppingListPage() {
  return (
    <>
      <MaterialTabs />
      <TodoListView shopping />
    </>
  )
}
