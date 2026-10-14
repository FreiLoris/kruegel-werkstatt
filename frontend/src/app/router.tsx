import { createBrowserRouter } from 'react-router'
import { CourtesyCarsPage } from '../features/bookings/CourtesyCarsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { EmployeesPage } from '../features/employees/EmployeesPage'
import { PinboardPage } from '../features/notes/PinboardPage'
import { StockPage } from '../features/stock/StockPage'
import { ShoppingListPage } from '../features/todos/ShoppingListPage'
import { TodosPage } from '../features/todos/TodosPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SwissGarageImportPage } from '../features/swissgarage/SwissGarageImportPage'
import { AppointmentsPage } from '../features/tasks/AppointmentsPage'
import { TaskDetailPage } from '../features/tasks/detail/TaskDetailPage'
import { TaskEditPage } from '../features/tasks/detail/TaskEditPage'
import { TaskSheetPage } from '../features/tasks/sheet/TaskSheetPage'
import { TaskWizardPage } from '../features/tasks/wizard/TaskWizardPage'
import { ComponentsPage } from '../features/system/ComponentsPage'
import { SystemPage } from '../features/system/SystemPage'
import { AppLayout } from './AppLayout'
import { CrashPage, NotFoundPage } from './ErrorPages'

/**
 * All pages of the app with their URL.
 * Every page has its own address → browser back works, links can be shared,
 * a tablet can have a specific page as its start page.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <CrashPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/swissgarage', element: <SwissGarageImportPage /> },
      { path: 'courtesy-cars', element: <CourtesyCarsPage /> },
      { path: 'tasks', element: <AppointmentsPage /> },
      // FB-04: pinboard, to-dos and shopping list are pages of their own again
      // (old addresses "/pinboard?view=list" etc. are forwarded by the pinboard)
      { path: 'pinboard', element: <PinboardPage /> },
      { path: 'todos', element: <TodosPage /> },
      { path: 'shopping', element: <ShoppingListPage /> },
      // FB-08: the tab "Lager" under "Material"
      { path: 'stock', element: <StockPage /> },
      { path: 'tasks/new', element: <TaskWizardPage /> },
      { path: 'tasks/:id', element: <TaskDetailPage /> },
      { path: 'tasks/:id/edit', element: <TaskEditPage /> },
      { path: 'system', element: <SystemPage /> },
      { path: 'system/components', element: <ComponentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Print view without the app frame – only the paper is printed
  { path: '/tasks/:id/sheet', element: <TaskSheetPage />, errorElement: <CrashPage /> },
])
