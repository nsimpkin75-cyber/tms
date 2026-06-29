import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function OpalAvatar({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Opal">
      <defs>
        <radialGradient id="opal-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#e0f7fa" />
          <stop offset="40%" stopColor="#b2ebf2" />
          <stop offset="100%" stopColor="#00bcd4" />
        </radialGradient>
        <radialGradient id="opal-face" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f7fa" />
        </radialGradient>
        <radialGradient id="opal-iris" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#80deea" />
          <stop offset="60%" stopColor="#00bcd4" />
          <stop offset="100%" stopColor="#006064" />
        </radialGradient>
        <radialGradient id="opal-shimmer" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="opal-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b2ebf2" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#e0f7fa" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00bcd4" stopOpacity="0.6" />
        </linearGradient>
        <filter id="opal-blur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      {/* Outer glow ring */}
      <circle cx="40" cy="40" r="38" fill="none" stroke="url(#opal-glow)" strokeWidth="2" opacity="0.7" />
      {/* Main circle */}
      <circle cx="40" cy="40" r="36" fill="url(#opal-bg)" />
      {/* Shimmer overlay */}
      <circle cx="40" cy="40" r="36" fill="url(#opal-shimmer)" />
      {/* Face */}
      <ellipse cx="40" cy="42" rx="22" ry="24" fill="url(#opal-face)" />
      {/* Hair — soft arc */}
      <path d="M18 38 Q20 16 40 14 Q60 16 62 38 Q55 20 40 20 Q25 20 18 38Z" fill="#00838f" opacity="0.8" />
      {/* Left eye */}
      <ellipse cx="32" cy="39" rx="5" ry="5.5" fill="white" />
      <ellipse cx="32" cy="39" rx="3.5" ry="3.8" fill="url(#opal-iris)" />
      <ellipse cx="32" cy="39" rx="2" ry="2.2" fill="#004d40" />
      <circle cx="33.2" cy="37.8" r="0.9" fill="white" />
      {/* Right eye */}
      <ellipse cx="48" cy="39" rx="5" ry="5.5" fill="white" />
      <ellipse cx="48" cy="39" rx="3.5" ry="3.8" fill="url(#opal-iris)" />
      <ellipse cx="48" cy="39" rx="2" ry="2.2" fill="#004d40" />
      <circle cx="49.2" cy="37.8" r="0.9" fill="white" />
      {/* Nose — minimal */}
      <path d="M38.5 44 Q40 46 41.5 44" stroke="#80cbc4" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Mouth — gentle smile */}
      <path d="M34 50 Q40 55 46 50" stroke="#00838f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Collar/neck hint */}
      <path d="M30 64 Q40 68 50 64 L52 76 Q40 78 28 76Z" fill="#00838f" opacity="0.5" />
      {/* Iridescent highlight */}
      <ellipse cx="29" cy="28" rx="6" ry="4" fill="white" opacity="0.3" transform="rotate(-20 29 28)" />
    </svg>
  );
}

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      setIsResettingPassword(true);
      setSuccess('Please enter your new password below.');
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        setError('Password reset via email is not currently configured. Please contact your administrator to reset your password.');
        setLoading(false);
        return;
      } else if (isResettingPassword) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        setSuccess('Password updated successfully! Signing you in...');
        setTimeout(() => {
          window.location.hash = '';
          window.location.reload();
        }, 2000);
      } else if (isSignUp) {
        await signUp(email, password, firstName, lastName);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete action');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, color-mix(in srgb, var(--brand-primary) 30%, #0f172a) 100%)' }}>
        {/* Background shimmer circles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 15%, transparent)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full blur-2xl" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 8%, transparent)' }} />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center mb-8">
            <OpalAvatar size={96} />
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-3">Evolo</h1>
          <p className="text-lg font-medium mb-4" style={{ color: 'var(--brand-accent, #06b6d4)' }}>The People Operating System</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Bringing people and organisations together for continuous growth.
          </p>
          <div className="mt-10 pt-8 border-t border-slate-700/60">
            <p className="text-slate-500 text-xs">
              Powered by <span className="font-medium" style={{ color: 'var(--brand-accent, #06b6d4)' }}>Opal</span> — your AI Growth Guide
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <OpalAvatar size={64} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Evolo</h1>
            <p className="text-slate-500 text-sm mt-1">The People Operating System</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {isResettingPassword ? 'Reset your password' :
               isForgotPassword ? 'Forgot password' :
               isSignUp ? 'Create your account' :
               'Welcome back'}
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              {isResettingPassword ? 'Enter your new password below.' :
               isForgotPassword ? 'Contact your administrator to reset access.' :
               isSignUp ? 'Join your team on Evolo.' :
               'Sign in to continue to Evolo.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isResettingPassword ? (
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your new password"
                  minLength={6}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Password must be at least 6 characters</p>
              </div>
            ) : isForgotPassword ? (
              <div className="rounded-lg p-4 bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-900">Need to reset your password?</p>
                <p className="text-sm mt-2 text-slate-700">
                  Please contact your administrator to reset your password.
                </p>
              </div>
            ) : (
              <>
                {isSignUp && (
                  <>
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="input-field"
                        placeholder="Jane"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="input-field"
                        placeholder="Smith"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {!isForgotPassword && (
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  isResettingPassword ? 'Updating password...' :
                  isSignUp ? 'Creating account...' :
                  'Signing in...'
                ) : (
                  isResettingPassword ? 'Update Password' :
                  isSignUp ? 'Create Account' :
                  'Sign In'
                )}
              </button>
            )}
          </form>

          {!isResettingPassword && (
            <div className="mt-5 text-center space-y-2">
              {!isForgotPassword && (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm font-medium"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(!isForgotPassword);
                    setIsSignUp(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  {isForgotPassword ? 'Back to sign in' : 'Forgot password?'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
