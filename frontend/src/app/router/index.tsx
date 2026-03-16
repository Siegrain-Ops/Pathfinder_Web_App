import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout }      from '@/components/layout/AppLayout'
import { DashboardPage }  from '@/pages/DashboardPage'
import { CharacterPage }  from '@/pages/CharacterPage'
import { SettingsPage }   from '@/pages/SettingsPage'
import { LoginPage }      from '@/pages/LoginPage'
import { RegisterPage }   from '@/pages/RegisterPage'
import { ProtectedRoute } from './ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
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
