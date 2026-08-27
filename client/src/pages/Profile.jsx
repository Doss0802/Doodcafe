import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle2, Mail, Phone, ShoppingBag, ArrowRight, Edit3 } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../store/authStore';

/* ── Info row helper ─────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, placeholder }) {
  return (
    <div className="pf-info-row">
      <div className="pf-info-icon"><Icon size={16} /></div>
      <div className="pf-info-body">
        <span className="pf-info-label">{label}</span>
        <span className={`pf-info-value ${!value ? 'pf-info-empty' : ''}`}>
          {value || placeholder}
        </span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function Profile() {
  const { user: storeUser, fetchMe } = useAuthStore();

  // Seed from store immediately so page isn't blank on first render,
  // then overwrite with fresh data from the API (catches stale store state).
  const [profile, setProfile] = useState(storeUser);

  useEffect(() => {
    document.title = 'My Profile — Dood Cafe';

    // Pull fresh profile data directly from the DB on every mount.
    // This is the source of truth — guarantees phone is shown even if
    // the auth store was hydrated from a stale localStorage snapshot.
    axiosInstance.get('/auth/me')
      .then(({ data }) => {
        const u = data.data?.user ?? data.user;
        if (u) {
          const fresh = {
            name:  u.name,
            email: u.email,
            phone: u.phone ?? null,
          };
          setProfile(fresh);
          // Also sync the global store so the navbar dropdown stays in sync
          fetchMe();
        }
      })
      .catch(() => {
        // Non-fatal — already seeded from store above
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return null;

  return (
    <main className="pf-page">
      <div className="container">

        {/* ── Page header ── */}
        <div className="pf-page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="pf-page-sub">Your account details at a glance</p>
        </div>

        <div className="pf-layout">

          {/* ── Left: Avatar card ── */}
          <div className="pf-avatar-card">
            <div className="pf-avatar-ring">
              <UserCircle2 size={64} strokeWidth={1.2} />
            </div>
            <h2 className="pf-name">{profile.name}</h2>

            {/* Quick nav buttons */}
            <div className="pf-quick-links">
              <Link to="/orders" className="pf-quick-btn" id="pf-view-orders-btn">
                <ShoppingBag size={15} />
                My Orders
                <ArrowRight size={13} className="pf-quick-arrow" />
              </Link>
            </div>
          </div>

          {/* ── Right: Details card ── */}
          <div className="pf-details-card">
            <div className="pf-details-header">
              <h3 className="pf-details-title">Account Information</h3>
              <span className="pf-edit-hint">
                <Edit3 size={13} /> Contact support to update details
              </span>
            </div>

            <div className="pf-info-list">
              <InfoRow
                icon={UserCircle2}
                label="Full Name"
                value={profile.name}
              />
              <InfoRow
                icon={Mail}
                label="Email Address"
                value={profile.email}
              />
              <InfoRow
                icon={Phone}
                label="Phone Number"
                value={profile.phone}
                placeholder="Not provided"
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
