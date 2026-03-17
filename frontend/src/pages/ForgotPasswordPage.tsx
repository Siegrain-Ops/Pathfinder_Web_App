// ---------------------------------------------------------------------------
// Forgot Password Page
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@/features/auth/services/auth.service'
import { Button } from '@/components/ui/Button'
import { AuthBrand } from '@/components/ui/AuthBrand'

export function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />

        <div className="bg-stone-800 border border-stone-700 rounded-lg p-6">
          {submitted ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-3">📬</div>
              <h2 className="text-stone-100 font-semibold text-lg mb-2">Check your email</h2>
              <p className="text-stone-400 text-sm leading-relaxed">
                If an account exists for <strong className="text-stone-200">{email}</strong>,
                we've sent a password reset link. It expires in 1 hour.
              </p>
              <p className="text-stone-500 text-xs mt-4">
                <Link to="/login" className="text-amber-400 hover:text-amber-300">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-stone-100 font-semibold text-lg mb-1">Reset password</h2>
              <p className="text-stone-400 text-sm mb-5">
                Enter your email and we'll send you a link to choose a new password.
              </p>

              {error && (
                <div className="mb-4 rounded border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                  {error}
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

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-stone-400 text-sm mt-4">
          <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
