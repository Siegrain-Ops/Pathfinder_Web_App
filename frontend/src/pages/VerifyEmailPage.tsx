// ---------------------------------------------------------------------------
// Verify Email Page — handles the ?token= link from the verification email
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authService } from '@/features/auth/services/auth.service'
import { AuthBrand } from '@/components/ui/AuthBrand'

type Status = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const [searchParams]  = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token found. Please use the link from your email.')
      return
    }

    authService.verifyEmail(token)
      .then(res => {
        setMessage(res.message)
        setStatus('success')
      })
      .catch(err => {
        setMessage(err instanceof Error ? err.message : 'Verification failed.')
        setStatus('error')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthBrand />

        <div className="bg-stone-800 border border-stone-700 rounded-lg p-6 text-center">
          {status === 'loading' && (
            <>
              <div className="text-3xl mb-3 animate-pulse">✉️</div>
              <p className="text-stone-300 text-sm">Verifying your email address…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-3xl mb-3">✅</div>
              <h2 className="text-stone-100 font-semibold text-lg mb-2">Email verified!</h2>
              <p className="text-stone-400 text-sm mb-5">{message}</p>
              <Link
                to="/login"
                className="inline-block rounded bg-amber-600 hover:bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition-colors"
              >
                Sign in
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-3xl mb-3">❌</div>
              <h2 className="text-stone-100 font-semibold text-lg mb-2">Verification failed</h2>
              <p className="text-stone-400 text-sm mb-5">{message}</p>
              <Link
                to="/login"
                className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
