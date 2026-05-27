/**
 * Route guard — redirects to /auth if not logged in.
 * Used to wrap /app and /dashboard routes.
 */
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, bootstrapped, bootstrap } = useAuthStore();
  const location = useLocation();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono">
        <div className="text-slate-500 text-xs tracking-widest">
          <span className="inline-block w-2 h-3 bg-accent-blue animate-pulse mr-2" />
          AUTHENTICATING…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
