/**
 * Root entry — decides where to send the user based on real auth state.
 *
 * Flow:
 *   1. /me  via cookie  →  user or null
 *   2. no user                            → /auth     (Act 0)
 *   3. user + !onboarding_done            → /onboarding/act-1
 *   4. user + onboarding_done             → /dashboard
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function AppEntry() {
  const navigate = useNavigate();
  const { user, bootstrapped, bootstrap } = useAuthStore();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (user.onboarding_done) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/onboarding/act-1', { replace: true });
    }
  }, [bootstrapped, user, navigate]);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono">
      <div className="text-slate-500 text-xs tracking-widest">
        <span className="inline-block w-2 h-3 bg-accent-blue animate-pulse mr-2" />
        BOOTING…
      </div>
    </div>
  );
}
