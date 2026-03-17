// ---------------------------------------------------------------------------
// Reset Password Page — handles the ?token= link from the reset email
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '@/features/auth/services/auth.service'
import { Button } from '@/components/ui/Button'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)

  const token = searchParams.get('token') ?? ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
      // Redirect to login after a short delay
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-amber-400 text-4xl">⚔</span>
          <h1 className="font-display text-2xl font-bold text-stone-100 mt-2">Pathfinder</h1>
          <p className="text-stone-400 text-sm mt-1">Character Manager</p>
        </div>

        <div className="bg-stone-800 border border-stone-700 rounded-lg p-6">
          {success ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="text-stone-100 font-semibold text-lg mb-2">Password updated!</h2>
              <p className="text-stone-400 text-sm mb-4">
                Your password has been changed. Redirecting to sign in…
              </p>
              <Link
                to="/login"
                className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
              >
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-stone-100 font-semibold text-lg mb-1">Choose a new password</h2>
              <p className="text-stone-400 text-sm mb-5">
                Enter a strong password for your account.
              </p>

              {!token && (
                <div className="mb-4 rounded border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                  Invalid or missing reset token. Please use the link from your email.
                </div>
              )}

              {error && (
                <div className="mb-4 rounded border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-1">
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="field w-full"
                    placeholder="At least 8 characters"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-300 mb-1">
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="field w-full"
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" loading={loading} disabled={!token} className="w-full" size="lg">
                  Update password
                </Button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="text-center text-stone-400 text-sm mt-4">
            <Link to="/forgot-password" className="text-amber-400 hover:text-amber-300 transition-colors">
              Request a new reset link
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
