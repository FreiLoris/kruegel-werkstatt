import { createBrowserRouter } from 'react-router'
import { CourtesyCarsPage } from '../features/bookings/CourtesyCarsPage'
import { CustomerPage } from '../features/customers/CustomerPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { EmployeesPage } from '../features/employees/EmployeesPage'
import { PinboardPage } from '../features/notes/PinboardPage'
import { StockPage } from '../features/stock/StockPage'
import { SuppliersPage } from '../features/suppliers/SuppliersPage'
import { ShoppingItemPage } from '../features/shopping/ShoppingItemPage'
import { ShoppingListPage } from '../features/shopping/ShoppingListPage'
import { TodosPage } from '../features/todos/TodosPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StatisticsPage } from '../features/statistics/StatisticsPage'
import { SwissGarageImportPage } from '../features/swissgarage/SwissGarageImportPage'
import { AppointmentsPage } from '../features/tasks/AppointmentsPage'
import { TaskDetailPage } from '../features/tasks/detail/TaskDetailPage'
import { TaskEditPage } from '../features/tasks/detail/TaskEditPage'
import { TaskSheetPage } from '../features/tasks/sheet/TaskSheetPage'
import { TaskWizardPage } from '../features/tasks/wizard/TaskWizardPage'
import { ComponentsPage } from '../features/system/ComponentsPage'
import { SystemPage } from '../features/system/SystemPage'
import { TireHotelPage } from '../features/tire-hotel/TireHotelPage'
import { TireLabelsPage } from '../features/tire-hotel/TireLabelsPage'
import { TireReceiptPage } from '../features/tire-hotel/TireReceiptPage'
import { ReturnLabelPage } from '../features/suppliers/ReturnLabelPage'
import { TireSetEditPage } from '../features/tire-hotel/TireSetEditPage'
import { TireSetPage } from '../features/tire-hotel/TireSetPage'
import { TireStorePage } from '../features/tire-hotel/TireStorePage'
import { TaskTireBookingPage } from '../features/tire-hotel/TaskTireBookingPage'
import { ModulePage } from '../features/modules/ModuleGate'
import { AppLayout } from './AppLayout'
import { CrashPage, NotFoundPage } from './ErrorPages'

/**
 * All pages of the app with their URL.
 * Every page has its own address â†’ browser back works, links can be shared,
 * a tablet can have a specific page as its start page.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <CrashPage />,
    children: [
      {
        // a page that crashes keeps header and navigation â€“ also on the TV without a keyboard
        errorElement: <CrashPage framed />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'employees', element: <EmployeesPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'settings/swissgarage', element: <SwissGarageImportPage /> },
          { path: 'courtesy-cars', element: <ModulePage module="COURTESY_CARS"><CourtesyCarsPage /></ModulePage> },
          { path: 'tasks', element: <AppointmentsPage /> },
          // FB-04: pinboard, to-dos and shopping list are pages of their own again
          // (old addresses "/pinboard?view=list" etc. are forwarded by the pinboard)
          { path: 'pinboard', element: <ModulePage module="BOARD"><PinboardPage /></ModulePage> },
          { path: 'todos', element: <ModulePage module="BOARD"><TodosPage /></ModulePage> },
          { path: 'shopping', element: <ModulePage module="MATERIAL"><ShoppingListPage /></ModulePage> },
          // FB-20: a position with everything about the part
          { path: 'shopping/:id', element: <ModulePage module="MATERIAL"><ShoppingItemPage /></ModulePage> },
          // FB-08: the tab "Lager" under "Material"
          { path: 'stock', element: <ModulePage module="MATERIAL"><StockPage /></ModulePage> },
          { path: 'suppliers', element: <ModulePage module="MATERIAL"><SuppliersPage /></ModulePage> },
          // UX G-05: look a customer up without starting a task
          { path: 'customers/:id', element: <CustomerPage /> },
          { path: 'tasks/new', element: <TaskWizardPage /> },
          { path: 'tasks/:id', element: <TaskDetailPage /> },
          { path: 'tasks/:id/edit', element: <TaskEditPage /> },
          // 13q: the tyre change of a task booked in the tyre hotel
          { path: 'tasks/:id/tires', element: <ModulePage module="TIRE_HOTEL"><TaskTireBookingPage /></ModulePage> },
          // FB-07: the tyre hotel
          { path: 'tires', element: <ModulePage module="TIRE_HOTEL"><TireHotelPage /></ModulePage> },
          { path: 'tires/new', element: <ModulePage module="TIRE_HOTEL"><TireStorePage /></ModulePage> },
          { path: 'tires/:id', element: <ModulePage module="TIRE_HOTEL"><TireSetPage /></ModulePage> },
          { path: 'tires/:id/edit', element: <ModulePage module="TIRE_HOTEL"><TireSetEditPage /></ModulePage> },
          // 15a: numbers and fun facts about the whole workshop
          { path: 'statistics', element: <ModulePage module="STATISTICS"><StatisticsPage /></ModulePage> },
          { path: 'system', element: <SystemPage /> },
          { path: 'system/components', element: <ComponentsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  // Print view without the app frame â€“ only the paper is printed
  { path: '/tasks/:id/sheet', element: <TaskSheetPage />, errorElement: <CrashPage /> },
  // FB-07: the labels of a set and the storage receipt for the customer
  { path: '/tires/:id/labels', element: <ModulePage module="TIRE_HOTEL"><TireLabelsPage /></ModulePage>, errorElement: <CrashPage /> },
  { path: '/tires/:id/receipt', element: <ModulePage module="TIRE_HOTEL"><TireReceiptPage /></ModulePage>, errorElement: <CrashPage /> },
  // FB-31: a return label for a supplier (`?item=` a position of the shopping list)
  { path: '/suppliers/:id/return-label', element: <ModulePage module="MATERIAL"><ReturnLabelPage /></ModulePage>, errorElement: <CrashPage /> },
])
