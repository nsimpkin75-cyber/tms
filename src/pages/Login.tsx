import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
        setError('Password reset via email is not currently configured. Please contact your administrator (nicola.hurcombe@eposnow.com) to reset your password.');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img
            src="/eposnow_futures.jpg"
            alt="Futures"
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-slate-900">Futures</h1>
          <p className="text-slate-600 mt-2">
            {isResettingPassword ? 'Reset Your Password' :
             isForgotPassword ? 'Reset Password' :
             'Talent Management System'}
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
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Need to reset your password?</strong>
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  Please contact your administrator to reset your password:
                </p>
                <p className="text-sm text-blue-900 font-medium mt-1">
                  nicola.hurcombe@eposnow.com
                </p>
              </div>
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
                      placeholder="John"
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
                      placeholder="Doe"
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
          <div className="mt-4 text-center space-y-2">
            {!isForgotPassword && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isForgotPassword ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
