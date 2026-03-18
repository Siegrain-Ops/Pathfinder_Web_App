import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout }          from '@/components/layout/AppLayout'
import { DashboardPage }      from '@/pages/DashboardPage'
import { CharacterPage }      from '@/pages/CharacterPage'
import { CharacterSetupPage } from '@/pages/CharacterSetupPage'
import { SettingsPage }       from '@/pages/SettingsPage'
import { LoginPage }          from '@/pages/LoginPage'
import { RegisterPage }       from '@/pages/RegisterPage'
import { VerifyEmailPage }    from '@/pages/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage }  from '@/pages/ResetPasswordPage'
import { ProtectedRoute }     from './ProtectedRoute'

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
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
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
      { path: 'characters/:id',       element: <CharacterPage /> },
      { path: 'characters/:id/setup', element: <CharacterSetupPage /> },
      { path: 'settings',             element: <SettingsPage /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
