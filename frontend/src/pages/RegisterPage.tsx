// ---------------------------------------------------------------------------
// Register Page
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/app/store/authStore'
import { Button } from '@/components/ui/Button'

export function RegisterPage() {
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const [displayName,      setDisplayName]      = useState('')
  const [email,            setEmail]            = useState('')
  const [password,         setPassword]         = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [error,            setError]            = useState<string | null>(null)

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

    try {
      await register(email, password, displayName)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-amber-400 text-4xl">⚔</span>
          <h1 className="font-display text-2xl font-bold text-stone-100 mt-2">
            Pathfinder
          </h1>
          <p className="text-stone-400 text-sm mt-1">Character Manager</p>
        </div>

        {/* Card */}
        <div className="bg-stone-800 border border-stone-700 rounded-lg p-6">
          <h2 className="text-stone-100 font-semibold text-lg mb-5">Create account</h2>

          {error && (
            <div className="mb-4 rounded border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-stone-300 mb-1">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                required
                autoComplete="name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="field w-full"
                placeholder="Aragorn"
              />
            </div>

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

            <Button type="submit" loading={isLoading} className="w-full" size="lg">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-stone-400 text-sm mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
