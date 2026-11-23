import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, X } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { resolveImageUrl } from '../../utils/resolveImageUrl';
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
  startAt: '',
  endAt: '',
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export default function AdminOffers() {
  const [offers, setOffers]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [editingId, setEditingId]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [removing, setRemoving]       = useState(null);
  const [formError, setFormError]     = useState('');

  // Image upload state
  const [imageFile, setImageFile]             = useState(null);
  const [imagePreview, setImagePreview]       = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [imageRemoved, setImageRemoved]       = useState(false);
  const [imageError, setImageError]           = useState('');

  const fileInputRef = useRef(null);

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

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /* ── Form helpers ─────────────────────────────────────────── */
  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const resetForm = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setImageError('');
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl('');
    setImageRemoved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startEdit = (offer) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setEditingId(offer.id);
    setFormError('');
    setImageError('');
    setForm({
      title:       offer.title || '',
      description: offer.description || '',
      offerType:   offer.offerType || 'dine-in',
      startAt:     toLocalInput(offer.startAt),
      endAt:       toLocalInput(offer.endAt),
    });
    setExistingImageUrl(offer.imageUrl || '');
    setImageFile(null);
    setImagePreview('');
    setImageRemoved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── File selection & removal ──────────────────────────────── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    // Check type: only JPEG, PNG, WEBP
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setImageError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check size: max 2 MB
    if (file.size > MAX_FILE_SIZE) {
      setImageError('Image file size exceeds 2 MB limit. Please select a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview('');
    setImageRemoved(true);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /* ── Submit (create or update with FormData) ──────────────── */
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
    if (imageError) {
      setFormError('Please resolve the image error before submitting.');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title.trim());
    if (form.description && form.description.trim()) {
      formData.append('description', form.description.trim());
    }
    formData.append('offerType', form.offerType);

    const startUtc = localInputToUTC(form.startAt);
    if (startUtc) {
      formData.append('startAt', startUtc);
    }
    const endUtc = localInputToUTC(form.endAt);
    if (endUtc) {
      formData.append('endAt', endUtc);
    }

    // Handle image payload
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (editingId) {
      if (imageRemoved) {
        // Explicitly clear image on update
        formData.append('imageUrl', '');
      } else if (existingImageUrl) {
        // Keep existing image
        formData.append('imageUrl', existingImageUrl);
      }
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await axiosInstance.put(`/offers/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const updated = res.data?.data;
        setOffers((prev) =>
          prev.map((o) => (o.id === editingId ? updated : o))
        );
        toast.success('Offer updated');
      } else {
        const res = await axiosInstance.post('/offers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
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

  // Determine current active preview image URL
  const activePreviewUrl = imagePreview || (!imageRemoved && existingImageUrl ? resolveImageUrl(existingImageUrl) : '');

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

              {/* Image Upload Control */}
              <div className="off-field off-field--full">
                <label className="off-label">Offer Banner Image (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="offer-image-file-input"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {activePreviewUrl ? (
                  <div className="flex items-center gap-4 p-3 bg-stone-100/80 rounded-xl border border-stone-200">
                    <img
                      src={activePreviewUrl}
                      alt="Offer preview"
                      className="w-20 h-20 object-cover rounded-lg border border-stone-300 flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="flex flex-col gap-2 min-w-0">
                      <span className="text-xs font-semibold text-stone-700 truncate">
                        {imageFile ? imageFile.name : (existingImageUrl ? 'Current saved image' : 'Selected image')}
                      </span>
                      {imageFile && (
                        <span className="text-[11px] text-stone-500">
                          {(imageFile.size / 1024).toFixed(0)} KB · Ready to save
                        </span>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <label
                          htmlFor="offer-image-file-input"
                          className="clay-btn clay-light text-xs font-bold px-3 py-1.5 min-h-[36px] cursor-pointer flex items-center gap-1.5 text-stone-700"
                        >
                          <UploadCloud size={14} /> {imageFile ? 'Change file' : 'Replace image'}
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={submitting}
                          className="clay-btn clay-danger text-xs font-bold px-3 py-1.5 min-h-[36px] flex items-center gap-1.5"
                        >
                          <X size={14} /> Remove image
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <label
                      htmlFor="offer-image-file-input"
                      className="clay-btn clay-light min-h-[44px] px-4 py-2.5 font-bold text-sm flex items-center gap-2 cursor-pointer text-stone-700 border border-stone-300 rounded-xl hover:text-stone-900"
                    >
                      <UploadCloud size={18} className="text-amber-600" />
                      <span>Choose Image File</span>
                    </label>
                    <span className="text-xs text-stone-500">
                      JPEG, PNG, or WebP (max 2 MB)
                    </span>
                  </div>
                )}

                {imageError && (
                  <p className="off-form-error mt-1">{imageError}</p>
                )}
              </div>

            </div>

            {/* Form Error */}
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
                  ? (editingId ? 'Saving Changes…' : 'Creating Offer…')
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
                        src={resolveImageUrl(offer.imageUrl)}
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
