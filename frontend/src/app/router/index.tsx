import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout }      from '@/components/layout/AppLayout'
import { DashboardPage }  from '@/pages/DashboardPage'
import { CharacterPage }  from '@/pages/CharacterPage'
import { SettingsPage }   from '@/pages/SettingsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,               element: <DashboardPage /> },
      { path: 'characters/:id',    element: <CharacterPage /> },
      { path: 'settings',          element: <SettingsPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
