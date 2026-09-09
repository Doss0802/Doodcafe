/**
 * PublicOnlyRoute — Redirects already-authenticated users away from
 * purely public pages (e.g. /login, /register) so they never land on
 * them after a successful session is already active.
 *
 * Behaviour:
 *   • Authenticated + admin/manager  → /admin
 *   • Authenticated + customer       → /
 *   • Unauthenticated                → renders children normally
 *
 * Uses the same hydration guard as ProtectedRoute so a hard reload
 * on /login doesn't flash the form before the store rehydrates.
 */

import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/* ── Tiny loading state ──────────────────────────────────────── */
function HydrationSplash() {
  return (
    <div
      id="public-route-hydration-spinner"
      role="status"
      aria-label="Loading…"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span className="loading-spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  // Wait one microtask tick for Zustand persist to rehydrate
  const [hydrated, setHydrated] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      Promise.resolve().then(() => setHydrated(true));
    }
  }, []);

  if (!hydrated) return <HydrationSplash />;

  if (isAuthenticated && user) {
    const isAdmin = ['admin', 'manager'].includes(user.role);
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  }

  return children;
}
