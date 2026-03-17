// ---------------------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/app/store/authStore'
import { authService } from '@/features/auth/services/auth.service'
import { Button } from '@/components/ui/Button'
import { AuthBrand } from '@/components/ui/AuthBrand'

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  const [showResend,   setShowResend]   = useState(false)
  const [resendSent,   setResendSent]   = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowResend(false)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      // Show resend button when the account is not yet verified
      if (msg.toLowerCase().includes('verify')) {
        setShowResend(true)
      }
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      await authService.resendVerification(email)
      setResendSent(true)
      setShowResend(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />

        {/* Card */}
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-6">
          <h2 className="text-stone-100 font-semibold text-lg mb-5">Sign in</h2>

          {resendSent && (
            <div className="mb-4 rounded border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-300">
              Verification email sent! Check your inbox.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {error}
              {showResend && (
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={() => { void handleResend() }}
                  className="mt-2 block w-full rounded border border-amber-700/50 bg-amber-900/20 px-3 py-1.5
                             text-xs text-amber-300 hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field w-full"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field w-full"
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isLoading} className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-stone-400 text-sm mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
