import React, { useState } from 'react';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { APP_TAGLINE } from '../lib/appParams';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many failed attempts. Wait a moment and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export const SignIn: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(AUTH_ERROR_MESSAGES[err?.code] || 'Could not sign in. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-cool flex items-center justify-center p-[21px] font-body">
      <div className="w-full max-w-[377px]">
        <div className="flex items-center gap-[13px] justify-center mb-[34px]">
          <img src="/brand/phi-tile.svg" alt="" className="h-9 w-9" />
          <div>
            <span className="font-display font-extrabold tracking-[-0.02em] text-lg whitespace-nowrap">
              <span className="text-saffron-text">Incendium</span><span className="text-navy">Phi</span>
            </span>
            <p className="text-[10px] text-slate font-medium">{APP_TAGLINE}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-card p-[21px] space-y-[13px]">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full bg-bg-cool border border-line rounded-[8px] px-[13px] py-[8px] text-sm text-navy focus:outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-[5px]">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-bg-cool border border-line rounded-[8px] px-[13px] py-[8px] text-sm text-navy focus:outline-none focus:border-teal"
            />
          </div>

          {error && (
            <div className="flex items-start gap-[8px] bg-red-50 border border-red-200 rounded-[8px] p-[8px]">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-[1px]" />
              <p className="text-[11px] text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="w-full flex items-center justify-center gap-[8px] px-[13px] py-[8px] bg-teal hover:opacity-90 rounded-[8px] text-xs font-bold uppercase tracking-wider text-white transition-opacity duration-[144ms] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
            {submitting ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;
