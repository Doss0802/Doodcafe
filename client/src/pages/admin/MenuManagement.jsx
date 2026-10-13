import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat, Plus, Edit3, Trash2, X, Check,
  RefreshCw, Loader2, ArrowLeft, AlertCircle,
  Star, Leaf, ImageIcon, ShieldAlert, DollarSign, Clock,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

/* ─── Palette Tokens ──────────────────────────────────────── */
const T = {
  gold: '#D4A017',
  goldBg: '#FEF3C7',
  charcoal: '#1A1A1A',
  border: '#E5E7EB',
  red: '#B91C1C',
  redBg: '#FEF2F2',
  redBorder: '#FECACA',
  blue: '#1E40AF',
  blueBg: '#EFF6FF',
  blueBorder: '#BFDBFE',
  green: '#059669',
  greenBg: '#ECFDF5',
  gray: '#6B6B6B',
  surface: '#FCFBF9',
};

/* ─── Badge ───────────────────────────────────────────────── */
function Badge({ label, color, bg }) {
  return (
    <span style={{
      fontSize: '0.67rem', fontWeight: 700, padding: '2px 7px',
      borderRadius: 99, color, background: bg, display: 'inline-flex', alignItems: 'center',
    }}>
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   ITEM FORM MODAL  — Add / Edit a menu item
═══════════════════════════════════════════════════════════ */
function ItemFormModal({ itemToEdit, categories, onClose, onSaved }) {
  const isEdit = Boolean(itemToEdit?._id);
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: itemToEdit?.name || '',
    price: itemToEdit?.price ?? '',
    category: itemToEdit?.category?._id || itemToEdit?.category || '',
    description: itemToEdit?.description || '',
    imageUrl: itemToEdit?.imageUrl || itemToEdit?.image || '',
    isVeg: itemToEdit?.isVeg ?? false,
    isBestseller: itemToEdit?.isBestseller ?? false,
    available: itemToEdit?.available ?? true,
    preparationTime: itemToEdit?.preparationTime ?? 10,
    tags: (itemToEdit?.tags || []).join(', '),
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(itemToEdit?.imageUrl || itemToEdit?.image || '');
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Keyboard escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    set('imageUrl', ''); // clear URL if file chosen
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.price === '' || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) errs.price = 'Valid price required';
    if (!form.category) errs.category = 'Category is required';
    if (form.imageUrl && !/^https?:\/\//i.test(form.imageUrl)) errs.imageUrl = 'Must be a valid URL (https://...)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('price', form.price);
      payload.append('category', form.category);
      payload.append('description', form.description.trim());
      payload.append('isVeg', form.isVeg);
      payload.append('isBestseller', form.isBestseller);
      payload.append('available', form.available);
      payload.append('preparationTime', form.preparationTime);
      payload.append('tags', form.tags);
      if (imageFile) {
        payload.append('image', imageFile);
      } else if (form.imageUrl.trim()) {
        payload.append('imageUrl', form.imageUrl.trim());
      }

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      let res;
      if (isEdit) {
        res = await axiosInstance.put(`/menu-management/${itemToEdit._id}`, payload, cfg);
      } else {
        res = await axiosInstance.post('/menu-management', payload, cfg);
      }

      toast.success(isEdit ? `"${res.data.data.name}" updated!` : `"${res.data.data.name}" added!`);
      onSaved(res.data.data, isEdit);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (err) => ({
    width: '100%', padding: '0.6rem 0.75rem', fontSize: '0.85rem',
    border: `1px solid ${err ? '#FCA5A5' : T.border}`, borderRadius: 8,
    background: err ? '#FEF2F2' : '#FAFAFA', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: T.charcoal,
    transition: 'border-color 0.15s',
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.65)',
        backdropFilter: 'blur(5px)', zIndex: 1100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
        animation: 'mgmFadeIn 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 580,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
          animation: 'mgmSlideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.4rem', borderBottom: `1px solid ${T.border}`,
          background: T.surface, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: T.goldBg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: T.gold,
            }}>
              <ChefHat size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: T.charcoal }}>
                {isEdit ? 'Update Menu Item' : 'Add New Dish'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: T.gray }}>
                {isEdit ? `Editing: ${itemToEdit.name}` : 'Fill in the details below'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${T.border}`, color: T.gray,
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Name + Price row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 4 }}>
                Item Name <span style={{ color: T.red }}>*</span>
              </label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Masala Dosa"
                style={inputStyle(errors.name)}
                maxLength={80}
              />
              {errors.name && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: T.red }}>{errors.name}</p>}
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 4 }}>
                Price (₹) <span style={{ color: T.red }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.gray, fontSize: '0.82rem', fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle(errors.price), paddingLeft: '1.6rem' }}
                />
              </div>
              {errors.price && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: T.red }}>{errors.price}</p>}
            </div>
          </div>

          {/* Category + Prep Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 4 }}>
                Category <span style={{ color: T.red }}>*</span>
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                style={{ ...inputStyle(errors.category), cursor: 'pointer' }}
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                ))}
              </select>
              {errors.category && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: T.red }}>{errors.category}</p>}
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 4 }}>
                Prep Time (mins)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.gray }}>
                  <Clock size={13} />
                </span>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={form.preparationTime}
                  onChange={e => set('preparationTime', e.target.value)}
                  style={{ ...inputStyle(false), paddingLeft: '1.6rem' }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 4 }}>
              Description
              <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 400, color: T.gray }}>max 300 chars</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Short description of the dish…"
              rows={3}
              maxLength={300}
              style={{ ...inputStyle(false), resize: 'vertical', lineHeight: 1.45 }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 4 }}>
              Tags
              <span style={{ marginLeft: 6, fontSize: '0.68rem', fontWeight: 400, color: T.gray }}>comma separated</span>
            </label>
            <input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="spicy, popular, south-indian"
              style={inputStyle(false)}
            />
          </div>

          {/* Image Upload / URL */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.charcoal, display: 'block', marginBottom: 6 }}>
              Dish Photo
            </label>
            {/* Dropzone */}
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? T.gold : T.border}`,
                borderRadius: 12, padding: '1rem',
                background: dragActive ? '#FFFDF8' : '#FBFBFA',
                cursor: 'pointer', transition: 'all 0.18s',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '0.5rem', textAlign: 'center',
                minHeight: imagePreview ? 'auto' : 100,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
              {imagePreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}`, flexShrink: 0 }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: T.charcoal }}>
                      {imageFile ? imageFile.name : 'Current image'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: T.gold }}>Click or drag to replace</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(''); set('imageUrl', ''); }}
                      style={{ marginTop: 4, fontSize: '0.68rem', color: T.red, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.goldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold }}>
                    <ImageIcon size={18} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: T.charcoal }}>
                    <strong>Drag & drop</strong> or <span style={{ color: T.gold, textDecoration: 'underline' }}>browse</span>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: T.gray }}>JPEG · PNG · WebP · max 5 MB</p>
                </>
              )}
            </div>

            {/* OR — URL fallback */}
            {!imageFile && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: '0.73rem', color: T.gray, display: 'block', marginBottom: 3 }}>
                  — or paste an image URL —
                </label>
                <input
                  value={form.imageUrl}
                  onChange={e => { set('imageUrl', e.target.value); if (e.target.value) setImagePreview(e.target.value); else setImagePreview(''); }}
                  placeholder="https://example.com/dish.jpg"
                  style={inputStyle(errors.imageUrl)}
                />
                {errors.imageUrl && <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: T.red }}>{errors.imageUrl}</p>}
              </div>
            )}
          </div>

          {/* Toggle Switches */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { key: 'isVeg', label: '🌿 Veg', on: '#047857', onBg: '#ECFDF5', onBorder: '#A7F3D0', offBorder: T.border },
              { key: 'isBestseller', label: '⭐ Bestseller', on: '#B45309', onBg: '#FEF3C7', onBorder: '#FDE68A', offBorder: T.border },
              { key: 'available', label: '✅ Available', on: T.green, onBg: T.greenBg, onBorder: '#6EE7B7', offBorder: T.border },
            ].map(({ key, label, on, onBg, onBorder, offBorder }) => (
              <button
                key={key}
                type="button"
                onClick={() => set(key, !form[key])}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '0.78rem', fontWeight: 600, padding: '6px 12px',
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${form[key] ? onBorder : offBorder}`,
                  background: form[key] ? onBg : '#F9FAFB',
                  color: form[key] ? on : T.gray,
                }}
              >
                {label}
                {form[key] ? <Check size={13} /> : <X size={13} />}
              </button>
            ))}
          </div>
        </form>

        {/* Footer */}
        <div style={{
          padding: '0.9rem 1.4rem', borderTop: `1px solid ${T.border}`,
          background: T.surface, display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, color: T.charcoal, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
              color: '#fff', background: 'linear-gradient(135deg, #D4A017 0%, #B8860B 100%)',
              border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={14} className="mgm-spin" /> : (isEdit ? <Check size={14} /> : <Plus size={14} />)}
            {saving ? 'Saving…' : (isEdit ? 'Update Item' : 'Add Item')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN  MenuManagement  Component
═══════════════════════════════════════════════════════════ */
export default function MenuManagement() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // null = Add, obj = Edit
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId]     = useState(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Guard: Admin only
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', fontFamily: 'Outfit, sans-serif' }}>
        <ShieldAlert size={48} style={{ color: '#EF4444' }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Admin Access Required</h2>
        <p style={{ color: T.gray, margin: 0 }}>This panel is restricted to administrators only.</p>
        <button onClick={() => navigate('/')} style={{ padding: '0.5rem 1.25rem', background: T.gold, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
          Go Home
        </button>
      </main>
    );
  }

  /* ── Fetch categories ── */
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/menu-management/categories');
      setCategories(data.data || []);
    } catch { /* silent */ }
  }, []);

  /* ── Fetch items ── */
  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/menu-management?page=${p}&limit=30`);
      setItems(data.data || []);
      setTotalPages(data.meta?.pages ?? 1);
      setPage(p);
    } catch (err) {
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchItems(1);
  }, [fetchCategories, fetchItems]);

  /* ── Open add modal ── */
  const openAdd = () => { setSelectedItem(null); setModalOpen(true); };

  /* ── Open edit modal ── */
  const openEdit = (item) => { setSelectedItem(item); setModalOpen(true); };

  /* ── Handle saved ── */
  const handleSaved = useCallback((savedItem, isEdit) => {
    if (isEdit) {
      setItems(prev => prev.map(i => i._id === savedItem._id ? savedItem : i));
    } else {
      setItems(prev => [savedItem, ...prev]);
    }
  }, []);

  /* ── Remove Item ── */
  const handleRemove = async (item) => {
    const ok = window.confirm(`Remove "${item.name}" permanently? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(item._id);
    try {
      await axiosInstance.delete(`/menu-management/${item._id}`);
      setItems(prev => prev.filter(i => i._id !== item._id));
      toast.success(`🗑️ "${item.name}" removed`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove item');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Toggle availability ── */
  const handleToggleAvailable = async (item) => {
    setSavingId(item._id);
    try {
      const { data } = await axiosInstance.put(`/menu-management/${item._id}`,
        JSON.stringify({ available: !item.available }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, ...data.data } : i));
      toast.success(!item.available ? 'Marked as available' : 'Marked as unavailable');
    } catch {
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  /* ── Toggle bestseller ── */
  const handleToggleBestseller = async (item) => {
    setSavingId(item._id);
    try {
      const { data } = await axiosInstance.put(`/menu-management/${item._id}`,
        JSON.stringify({ isBestseller: !item.isBestseller }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, ...data.data } : i));
      toast.success(!item.isBestseller ? '⭐ Bestseller marked' : 'Bestseller removed');
    } catch {
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  const isBusy = (id) => deletingId === id || savingId === id;

  return (
    <>
      <style>{`
        @keyframes mgmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes mgmSlideUp { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes mgmSpin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .mgm-spin { animation: mgmSpin 0.8s linear infinite; display:inline-block; }
        .mgm-card:hover { border-color: #D4A017 !important; box-shadow: 0 4px 18px rgba(212,160,23,0.12) !important; }
        .mgm-chip:hover:not(:disabled) { filter: brightness(0.93); }
        .mgm-btn-edit:hover { background:#DBEAFE !important; border-color:#93C5FD !important; }
        .mgm-btn-del:hover:not(:disabled) { background:#FEE2E2 !important; border-color:#FCA5A5 !important; }
        @media (max-width:768px) {
          .mgm-root { padding: 1rem 0.85rem 3rem !important; }
          .mgm-header { flex-direction:column !important; align-items:stretch !important; gap:0.8rem !important; }
          .mgm-actions { width:100% !important; }
          .mgm-grid { grid-template-columns:1fr !important; }
          .mgm-card { flex-direction:column !important; }
          .mgm-card-img { width:100% !important; height:160px !important; }
          .mgm-card-img img { height:160px !important; }
          .mgm-card-btns { flex-direction:row !important; }
          .mgm-btn-edit, .mgm-btn-del { flex:1 !important; justify-content:center !important; }
        }
      `}</style>

      <main className="mgm-root" style={{ maxWidth: 1080, margin: '0 auto', padding: '2rem 1.5rem 4rem', fontFamily: 'Outfit, sans-serif', color: T.charcoal }}>

        {/* ── Header ── */}
        <div className="mgm-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600, color: T.charcoal, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer', textDecoration: 'none' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.goldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold }}>
              <ChefHat size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.3px' }}>Menu Management</h1>
              <p style={{ margin: 0, fontSize: '0.78rem', color: T.gray }}>Add, update and remove cafe dishes</p>
            </div>
          </div>
          <div className="mgm-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => fetchItems(page)}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600, color: T.charcoal, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8, padding: '0.45rem 0.85rem', cursor: 'pointer' }}
            >
              <RefreshCw size={14} className={loading ? 'mgm-spin' : ''} /> Refresh
            </button>
            <button
              onClick={openAdd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #D4A017 0%, #B8860B 100%)', border: 'none', borderRadius: 9, padding: '0.52rem 1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(212,160,23,0.28)' }}
            >
              <Plus size={16} /> Add New Dish
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '1rem', color: T.gray }}>
            <Loader2 size={34} className="mgm-spin" style={{ color: T.gold }} />
            <p style={{ margin: 0 }}>Loading menu items…</p>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && items.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '1rem', color: T.gray }}>
            <AlertCircle size={38} style={{ color: T.gold, opacity: 0.6 }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No menu items yet. Click "Add New Dish" to get started.</p>
          </div>
        )}

        {/* ── Items Grid ── */}
        {!loading && items.length > 0 && (
          <div className="mgm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.2rem' }}>
            {items.map(item => (
              <div
                key={item._id}
                className="mgm-card"
                style={{
                  background: '#fff',
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: '1rem',
                  display: 'flex',
                  gap: '0.9rem',
                  opacity: !item.available ? 0.6 : 1,
                  transition: 'border-color 0.18s, box-shadow 0.18s, opacity 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
              >
                {/* Image */}
                <div className="mgm-card-img" style={{ width: 88, flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}`, background: '#FAF8F5' }}>
                  {item.imageUrl || item.image ? (
                    <img
                      src={item.imageUrl || item.image}
                      alt={item.name}
                      style={{ width: '100%', height: 88, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB' }}>
                      <ImageIcon size={26} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {/* Name + badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>
                      {item.name}
                    </h3>
                  </div>

                  {/* Category + badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                    {item.category?.name && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: T.gold, background: T.goldBg, padding: '1px 7px', borderRadius: 4 }}>
                        {item.category.icon} {item.category.name}
                      </span>
                    )}
                    {item.isVeg && <Badge label="🌿 Veg" color="#047857" bg="#ECFDF5" />}
                    {item.isBestseller && <Badge label="⭐ Best" color="#B45309" bg="#FEF3C7" />}
                    {!item.available && <Badge label="Unavailable" color="#6B7280" bg="#F3F4F6" />}
                  </div>

                  {/* Price + prep time */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: T.gold, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <DollarSign size={13} />₹{item.price?.toFixed ? item.price.toFixed(2) : item.price}
                    </span>
                    {item.preparationTime && (
                      <span style={{ fontSize: '0.72rem', color: T.gray, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={12} />{item.preparationTime}m
                      </span>
                    )}
                  </div>

                  {/* Description preview */}
                  {item.description && (
                    <p style={{ margin: 0, fontSize: '0.73rem', color: T.gray, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  )}

                  {/* Toggle chips */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.35rem', borderTop: `1px solid #F3F4F6`, marginTop: 'auto' }}>
                    <button
                      className="mgm-chip"
                      onClick={() => handleToggleAvailable(item)}
                      disabled={isBusy(item._id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px',
                        borderRadius: 6, border: `1px solid ${item.available ? '#6EE7B7' : T.border}`,
                        background: item.available ? T.greenBg : '#F9FAFB',
                        color: item.available ? T.green : T.gray, cursor: 'pointer',
                        opacity: isBusy(item._id) ? 0.5 : 1,
                      }}
                    >
                      {isBusy(item._id) ? <Loader2 size={10} className="mgm-spin" /> : <Check size={10} />}
                      {item.available ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      className="mgm-chip"
                      onClick={() => handleToggleBestseller(item)}
                      disabled={isBusy(item._id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px',
                        borderRadius: 6, border: `1px solid ${item.isBestseller ? '#FDE68A' : T.border}`,
                        background: item.isBestseller ? T.goldBg : '#F9FAFB',
                        color: item.isBestseller ? '#B45309' : T.gray, cursor: 'pointer',
                        opacity: isBusy(item._id) ? 0.5 : 1,
                      }}
                    >
                      <Star size={10} />{item.isBestseller ? 'Bestseller' : 'Not Featured'}
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="mgm-card-btns" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className="mgm-btn-edit"
                      onClick={() => openEdit(item)}
                      disabled={isBusy(item._id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueBorder}`, padding: '5px 11px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      <Edit3 size={12} /> Update Item
                    </button>
                    <button
                      className="mgm-btn-del"
                      onClick={() => handleRemove(item)}
                      disabled={isBusy(item._id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, padding: '5px 11px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s', opacity: isBusy(item._id) ? 0.55 : 1 }}
                    >
                      {deletingId === item._id ? <Loader2 size={12} className="mgm-spin" /> : <Trash2 size={12} />}
                      {deletingId === item._id ? 'Removing…' : 'Remove Item'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
              <button
                key={pg}
                onClick={() => fetchItems(pg)}
                style={{
                  minWidth: 34, height: 34, padding: '0 0.5rem',
                  borderRadius: 7, border: `1px solid ${pg === page ? T.gold : T.border}`,
                  background: pg === page ? T.gold : '#fff',
                  color: pg === page ? '#fff' : T.charcoal,
                  fontWeight: pg === page ? 700 : 500,
                  fontSize: '0.82rem', cursor: 'pointer',
                }}
              >
                {pg}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ── Item Form Modal ── */}
      {modalOpen && (
        <ItemFormModal
          itemToEdit={selectedItem}
          categories={categories}
          onClose={() => { setModalOpen(false); setSelectedItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
