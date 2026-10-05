import { createBrowserRouter } from 'react-router'
import { EmployeesPage } from '../features/employees/EmployeesPage'
import { HomePage } from '../features/home/HomePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SwissGarageImportPage } from '../features/swissgarage/SwissGarageImportPage'
import { AppointmentsPage } from '../features/tasks/AppointmentsPage'
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
      { index: true, element: <HomePage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/swissgarage', element: <SwissGarageImportPage /> },
      { path: 'tasks', element: <AppointmentsPage /> },
      { path: 'tasks/new', element: <TaskWizardPage /> },
      { path: 'system', element: <SystemPage /> },
      { path: 'system/components', element: <ComponentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Print view without the app frame – only the paper is printed
  { path: '/tasks/:id/sheet', element: <TaskSheetPage />, errorElement: <CrashPage /> },
])
