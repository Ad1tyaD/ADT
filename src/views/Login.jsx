import { useState } from 'react'
import { TrendingUp, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import firebaseService from '../services/FirebaseService'
import { useTrade } from '../context/TradeContext'

function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setIsLoading(true)

    try {
      let result
      if (isSignUp) {
        result = await firebaseService.signUp(email, password)
      } else {
        result = await firebaseService.signIn(email, password)
      }

      if (result.success) {
        // User will be set automatically via auth state listener
      } else {
        setError(result.error || 'Authentication failed')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-midnight-950 via-midnight-900 to-purple-950">
      <div className="glass-card w-full max-w-md p-8 space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-midnight-500 to-purple-600 flex items-center justify-center shadow-lg shadow-midnight-500/30">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text">ADTrade</h1>
            <p className="text-gray-400 text-sm mt-1">Your Personal Trading Assistant</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 border-l-4 border-loss flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-loss flex-shrink-0" />
            <p className="text-loss-light text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>{isSignUp ? 'Sign Up' : 'Sign In'}</>
            )}
          </button>
        </form>

        {/* Toggle Sign Up/Sign In */}
        <div className="text-center text-sm text-gray-400">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(false)
                  setError('')
                }}
                className="text-midnight-400 hover:text-midnight-300 underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(true)
                  setError('')
                }}
                className="text-midnight-400 hover:text-midnight-300 underline"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login

