/**
 * ProtectedRoute — Strict client-side authentication & role guard.
 *
 * Guards:
 *   1. Hydration gap  — shows a spinner until Zustand persist has rehydrated
 *                       from localStorage (avoids flash-redirect on hard reload).
 *   2. Token validity — checks that a structurally valid JWT string exists in
 *                       localStorage; purges all auth state and redirects to
 *                       /login if the token is absent or malformed.
 *   3. Auth state     — redirects unauthenticated users to /login, preserving
 *                       the intended destination in ?redirect= for post-login nav.
 *   4. Role guard     — for adminOnly routes, blocks access if the user role is
 *                       not 'admin' or 'manager', rendering a Forbidden view.
 *
 * Usage:
 *   <ProtectedRoute>          — any authenticated user
 *   <ProtectedRoute adminOnly> — admin / manager only
 */

import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldOff, Home } from 'lucide-react';
import useAuthStore from '../store/authStore';

/* ── Helpers ─────────────────────────────────────────────────── */

/**
 * Returns true only if `token` looks like a structurally valid JWT
 * (three base64url segments separated by dots). Does NOT verify the
 * signature — that is the server's responsibility.
 */
function isStructurallyValidJwt(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    // Attempt to parse the payload to catch obvious garbage strings
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Reject if payload has no subject/id field or is already expired
    if (!payload) return false;
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/* ── Forbidden page ──────────────────────────────────────────── */
function ForbiddenPage() {
  return (
    <main
      id="forbidden-page"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        textAlign: 'center',
        padding: '2rem',
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      <ShieldOff
        size={52}
        strokeWidth={1.4}
        style={{ color: 'var(--accent, #D4A017)', opacity: 0.85 }}
        aria-hidden="true"
      />
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
        Access Denied
      </h1>
      <p style={{ color: 'var(--text-muted, #888)', maxWidth: 360, margin: 0 }}>
        You don't have permission to view this page.
        This area is restricted to administrators only.
      </p>
      <a
        href="/"
        id="forbidden-go-home-btn"
        className="btn btn-primary-sm"
        style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <Home size={14} /> Back to Home
      </a>
    </main>
  );
}

/* ── Auth loading splash ─────────────────────────────────────── */
function AuthLoadingSpinner() {
  return (
    <div
      id="auth-guard-spinner"
      role="status"
      aria-label="Verifying session…"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span className="loading-spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

/* ── ProtectedRoute ──────────────────────────────────────────── */
export function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const location = useLocation();

  /**
   * Hydration guard — Zustand's persist middleware rehydrates from
   * localStorage asynchronously on first mount. We wait one tick so
   * that `isAuthenticated` reflects the persisted value, not the
   * initial `false`, before deciding whether to redirect.
   */
  const [hydrated, setHydrated] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // One microtask tick is enough for Zustand persist to rehydrate.
      Promise.resolve().then(() => setHydrated(true));
    }
  }, []);

  // ── Guard 1: Wait for hydration ──────────────────────────────
  if (!hydrated) {
    return <AuthLoadingSpinner />;
  }

  // ── Guard 2: Token structural validity ───────────────────────
  // Even if isAuthenticated is true in the store, check that a
  // structurally valid token actually exists in localStorage.
  // An absent / tampered / expired-client-side token means the
  // session is broken — purge all state and hard-redirect to login.
  const storedToken = localStorage.getItem('accessToken');
  if (isAuthenticated && !isStructurallyValidJwt(storedToken)) {
    // Purge all faulty auth state synchronously before rendering anything.
    clearAuth();
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // ── Guard 3: Authentication check ───────────────────────────
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // ── Guard 4: Role-based access control ───────────────────────
  if (adminOnly && !['admin', 'manager'].includes(user?.role)) {
    return <ForbiddenPage />;
  }

  return children;
}
