import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

/* ── Helpers ───────────────────────────────────────────────── */
function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function statusBadge(status) {
  const map = {
    live:      { label: 'Live',      cls: 'off-badge off-badge--live' },
    scheduled: { label: 'Scheduled', cls: 'off-badge off-badge--scheduled' },
    expired:   { label: 'Expired',   cls: 'off-badge off-badge--expired' },
    removed:   { label: 'Removed',   cls: 'off-badge off-badge--expired' },
  };
  const cfg = map[status] || map.expired;
  return <span className={cfg.cls}>{cfg.label}</span>;
}

/* ── To datetime-local string (IST aware for <input>) ──────── */
function toLocalInput(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  // shift to IST (+05:30) for display in datetime-local
  const ist = new Date(d.getTime() + (5 * 60 + 30) * 60000);
  return ist.toISOString().slice(0, 16);
}

/* ── Convert datetime-local (IST) → UTC ISO for server ─────── */
function localInputToUTC(localStr) {
  if (!localStr) return null;
  // The input value is in IST; subtract 5h30m to get UTC
  const local = new Date(localStr);
  const utc = new Date(local.getTime() - (5 * 60 + 30) * 60000);
  return utc.toISOString();
}

const EMPTY_FORM = {
  title: '',
  description: '',
  offerType: 'dine-in',
  imageUrl: '',
  startAt: '',
  endAt: '',
};

export default function AdminOffers() {
  const [offers, setOffers]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving]   = useState(null);
  const [formError, setFormError] = useState('');

  /* ── Fetch ─────────────────────────────────────────────────── */
  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/offers/admin');
      setOffers(res.data?.data || []);
    } catch {
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Offers — Admin · Dood Cafe';
    fetchOffers();
  }, [fetchOffers]);

  /* ── Form helpers ─────────────────────────────────────────── */
  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (offer) => {
    setEditingId(offer.id);
    setFormError('');
    setForm({
      title:       offer.title || '',
      description: offer.description || '',
      offerType:   offer.offerType || 'dine-in',
      imageUrl:    offer.imageUrl || '',
      startAt:     toLocalInput(offer.startAt),
      endAt:       toLocalInput(offer.endAt),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Submit (create or update) ────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (form.title.trim().length > 80) {
      setFormError('Title must be at most 80 characters.');
      return;
    }
    if (form.description && form.description.trim().length > 300) {
      setFormError('Description must be at most 300 characters.');
      return;
    }
    if (form.startAt && form.endAt && new Date(form.endAt) <= new Date(form.startAt)) {
      setFormError('End date/time must be after start date/time.');
      return;
    }

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      offerType:   form.offerType,
      imageUrl:    form.imageUrl.trim() || null,
      startAt:     localInputToUTC(form.startAt),
      endAt:       localInputToUTC(form.endAt),
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await axiosInstance.put(`/offers/${editingId}`, payload);
        const updated = res.data?.data;
        setOffers((prev) =>
          prev.map((o) => (o.id === editingId ? updated : o))
        );
        toast.success('Offer updated');
      } else {
        const res = await axiosInstance.post('/offers', payload);
        const created = res.data?.data;
        setOffers((prev) => [created, ...prev]);
        toast.success('Offer created');
      }
      resetForm();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Failed to save offer';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Remove ────────────────────────────────────────────────── */
  const handleRemove = async (id, title) => {
    if (!window.confirm(`Remove offer "${title}"? This cannot be undone.`)) return;
    setRemoving(id);
    try {
      await axiosInstance.delete(`/offers/${id}`);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      if (editingId === id) resetForm();
      toast.success('Offer removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove offer');
    } finally {
      setRemoving(null);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <main className="adm-page">
      <div className="container">

        {/* ── Admin Nav Tabs ── */}
        <div className="bg-stone-200/70 rounded-2xl p-1.5 flex gap-2 mb-6 flex-wrap sm:flex-nowrap">
          <Link to="/admin" className="clay-btn clay-light flex-1 min-h-[44px] py-2.5 px-4 font-bold text-sm flex items-center justify-center text-stone-600">
            <span>Admin Panel</span>
          </Link>
          <Link to="/staff/orders" className="clay-btn clay-light flex-1 min-h-[44px] py-2.5 px-4 font-bold text-sm flex items-center justify-center text-stone-600">
            <span>Staff Orders &amp; Live Delivery</span>
          </Link>
          <Link to="/admin/menu-management" className="clay-btn clay-light flex-1 min-h-[44px] py-2.5 px-4 font-bold text-sm flex items-center justify-center text-stone-600">
            <span>Menu Management</span>
          </Link>
          <Link to="/admin/event-bookings" className="clay-btn clay-light flex-1 min-h-[44px] py-2.5 px-4 font-bold text-sm flex items-center justify-center text-stone-600">
            <span>Event Bookings</span>
          </Link>
          <Link to="/admin/offers" className="clay-btn clay-gold clay-active flex-1 min-h-[44px] py-2.5 px-4 font-bold text-sm flex items-center justify-center text-stone-900">
            <span>Offers</span>
          </Link>
        </div>

        {/* ── Header ── */}
        <div className="adm-header">
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Offers</h1>
            <p className="adm-sub" style={{ marginTop: '0.25rem', color: '#888', fontSize: '0.875rem' }}>
              {offers.filter((o) => o.status === 'live').length} live · {offers.length} total
            </p>
          </div>
        </div>

        {/* ── Create / Edit Form ── */}
        <div className="off-form-card">
          <h2 className="off-form-title">
            {editingId ? 'Edit Offer' : 'New Offer'}
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="off-form-grid">

              {/* Title */}
              <div className="off-field off-field--full">
                <label className="off-label">
                  Offer Title <span className="off-required">*</span>
                </label>
                <input
                  className="off-input"
                  type="text"
                  placeholder="e.g. 20% off on Dine-in this weekend"
                  maxLength={80}
                  value={form.title}
                  onChange={setField('title')}
                />
                <span className="off-char-hint">{form.title.length}/80</span>
              </div>

              {/* Description */}
              <div className="off-field off-field--full">
                <label className="off-label">Description</label>
                <textarea
                  className="off-input off-textarea"
                  placeholder="Optional details about the offer…"
                  maxLength={300}
                  rows={3}
                  value={form.description}
                  onChange={setField('description')}
                />
                <span className="off-char-hint">{form.description.length}/300</span>
              </div>

              {/* Offer Type */}
              <div className="off-field">
                <label className="off-label">
                  Offer Type <span className="off-required">*</span>
                </label>
                <select
                  className="off-input off-select"
                  value={form.offerType}
                  onChange={setField('offerType')}
                >
                  <option value="dine-in">Dine-in</option>
                  <option value="delivery">Live Delivery</option>
                </select>
              </div>

              {/* Image URL */}
              <div className="off-field">
                <label className="off-label">Image URL (optional)</label>
                <input
                  className="off-input"
                  type="url"
                  placeholder="https://…"
                  value={form.imageUrl}
                  onChange={setField('imageUrl')}
                />
              </div>

              {/* Start Date/Time */}
              <div className="off-field">
                <label className="off-label">Start Date &amp; Time (IST)</label>
                <input
                  className="off-input"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={setField('startAt')}
                />
                <span className="off-hint">Empty = post immediately</span>
              </div>

              {/* End Date/Time */}
              <div className="off-field">
                <label className="off-label">End Date &amp; Time (IST)</label>
                <input
                  className="off-input"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={setField('endAt')}
                />
                <span className="off-hint">Empty = stays until manually removed</span>
              </div>

            </div>

            {/* Image preview */}
            {form.imageUrl && (
              <div className="off-img-preview">
                <img
                  src={form.imageUrl}
                  alt="Offer preview"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}

            {/* Error */}
            {formError && (
              <p className="off-form-error">{formError}</p>
            )}

            {/* Buttons */}
            <div className="off-form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="clay-btn clay-gold min-h-[44px] px-6 py-2.5 font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting
                  ? (editingId ? 'Saving…' : 'Creating…')
                  : (editingId ? 'Save Changes' : 'Create Offer')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="clay-btn clay-light min-h-[44px] px-6 py-2.5 font-bold text-sm text-stone-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Offers List ── */}
        <div style={{ marginTop: '2rem' }}>
          {loading ? (
            <div className="adm-loading-state">Loading offers…</div>
          ) : offers.length === 0 ? (
            <div className="adm-empty-state">
              <p>No offers yet. Create one above.</p>
            </div>
          ) : (
            <div className="off-list">
              {offers.map((offer) => (
                <div key={offer.id} className="off-card">
                  {/* Left: image thumbnail */}
                  {offer.imageUrl && (
                    <div className="off-card-img">
                      <img
                        src={offer.imageUrl}
                        alt={offer.title}
                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Body */}
                  <div className="off-card-body">
                    <div className="off-card-top">
                      <span className="off-card-title">{offer.title}</span>
                      {statusBadge(offer.status)}
                    </div>

                    {offer.description && (
                      <p className="off-card-desc">{offer.description}</p>
                    )}

                    <div className="off-card-meta">
                      <span className="off-card-type">
                        {offer.offerType === 'dine-in' ? '🍽 Dine-in' : '🛵 Delivery'}
                      </span>
                      <span className="off-card-time">
                        From: {fmtDateTime(offer.startAt)}
                      </span>
                      <span className="off-card-time">
                        Until: {offer.endAt ? fmtDateTime(offer.endAt) : 'Manual removal'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="off-card-actions">
                    <button
                      onClick={() => startEdit(offer)}
                      className="clay-btn clay-light text-xs font-bold px-4 py-2 min-h-[36px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemove(offer.id, offer.title)}
                      disabled={removing === offer.id}
                      className="clay-btn clay-danger text-xs font-bold px-4 py-2 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {removing === offer.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
