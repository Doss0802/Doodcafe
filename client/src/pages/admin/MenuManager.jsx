import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat, Eye, EyeOff, Edit3, Check, X, Upload, RefreshCw,
  Search, ToggleLeft, ToggleRight, DollarSign, ImageIcon,
  Leaf, Star, Clock, Tag, AlertCircle, Loader2, ShieldAlert, ArrowLeft,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

/* ─── Helpers ──────────────────────────────────────────────── */
function Badge({ children, color = '#D4A017', bg = '#FEF3C7' }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, color, background: bg, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {children}
    </span>
  );
}

/* ─── Inline Price Editor ─────────────────────────────────── */
function PriceEditor({ item, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(item.price));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    const price = parseFloat(val);
    if (isNaN(price) || price < 0) {
      toast.error('Enter a valid price');
      return;
    }
    await onSave(item._id, { price });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setVal(String(item.price)); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="mm-price-editor">
        <span className="mm-price-prefix">₹</span>
        <input
          ref={inputRef}
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mm-price-input"
          min="0"
          step="1"
        />
        <button className="mm-action-btn mm-save-btn" onClick={handleSave} disabled={saving} title="Save price">
          {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
        </button>
        <button className="mm-action-btn mm-cancel-btn" onClick={() => { setVal(String(item.price)); setEditing(false); }} title="Cancel">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="mm-price-display" onClick={() => setEditing(true)} title="Click to edit price">
      <span className="mm-price-value">₹{item.price}</span>
      <Edit3 size={12} className="mm-edit-icon" />
    </div>
  );
}

/* ─── Inline Image URL & File Upload Editor ──────────────── */
function ImageEditor({ item, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.imageUrl || item.image || '');
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (!val.trim() && val !== '') { toast.error('Enter a valid image URL'); return; }
    await onSave(item._id, { imageUrl: val.trim() });
    setEditing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setVal(dataUrl);
        await onSave(item._id, { imageUrl: dataUrl });
        toast.success('Replacement dish image uploaded!');
        setEditing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setVal(item.imageUrl || item.image || ''); setEditing(false); }
  };

  const imgSrc = item.imageUrl || item.image || '';

  if (editing) {
    return (
      <div className="mm-img-editor">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <ImageIcon size={13} style={{ color: '#888', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="url"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mm-img-input"
          placeholder="https://... or upload"
        />
        <button
          className="mm-action-btn mm-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          title="Upload image from computer"
        >
          <Upload size={12} />
        </button>
        <button className="mm-action-btn mm-save-btn" onClick={handleSave} disabled={saving} title="Save image URL">
          {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
        </button>
        <button className="mm-action-btn mm-cancel-btn" onClick={() => { setVal(item.imageUrl || item.image || ''); setEditing(false); }} title="Cancel">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="mm-img-display" onClick={() => setEditing(true)} title="Click to edit URL or upload replacement dish image">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      <div className="mm-thumb-wrap">
        {imgSrc
          ? <img src={imgSrc} alt={item.name} className="mm-thumb" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          : <div className="mm-thumb-placeholder"><span>{item.category?.icon || '🍽️'}</span></div>
        }
      </div>
      <Upload size={11} className="mm-edit-icon" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} title="Upload replacement image" />
    </div>
  );
}

/* ─── Main MenuManager ────────────────────────────────────── */
export default function MenuManager() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Guard — only admin can view
  if (user?.role !== 'admin') {
    return (
      <div className="mm-forbidden">
        <ShieldAlert size={48} style={{ color: '#D4A017', opacity: 0.85 }} />
        <h2>Admin Access Required</h2>
        <p>This page is restricted to administrators.</p>
        <button className="btn btn-primary-sm" onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [priceVisible, setPriceVisible] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);

  /* ── Fetch global price setting ── */
  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/menu/settings');
      const val = data.data?.show_prices_to_public;
      if (typeof val === 'boolean') setPriceVisible(val);
    } catch {
      // fallback to true
    }
  }, []);

  /* ── Fetch menu items ── */
  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/admin/menu-items?page=${p}&limit=30`);
      setItems(data.data || []);
      setMeta({ total: data.meta?.total || 0, pages: data.meta?.pages || 1 });
      setPage(p);
    } catch (err) {
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchItems(1);
  }, [fetchSettings, fetchItems]);

  /* ── Toggle price visibility globally ── */
  const handlePriceToggle = async () => {
    setToggleLoading(true);
    const next = !priceVisible;
    try {
      await axiosInstance.patch('/admin/menu-settings', { show_prices_to_public: next });
      setPriceVisible(next);
      toast.success(next ? '✅ Prices are now visible to customers' : '🙈 Prices hidden from customers');
    } catch {
      toast.error('Failed to update price visibility');
    } finally {
      setToggleLoading(false);
    }
  };

  /* ── Inline save handler ── */
  const handleSave = useCallback(async (id, patch) => {
    setSavingId(id);
    try {
      const { data } = await axiosInstance.patch(`/admin/menu-items/${id}`, patch);
      setItems((prev) => prev.map((it) => it._id === id ? { ...it, ...data.data } : it));
      toast.success('✅ Item updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  }, []);

  /* ── Toggle availability ── */
  const handleToggleAvailable = useCallback(async (item) => {
    await handleSave(item._id, { available: !item.available });
  }, [handleSave]);

  /* ── Toggle bestseller ── */
  const handleToggleBestseller = useCallback(async (item) => {
    await handleSave(item._id, { isBestseller: !item.isBestseller });
  }, [handleSave]);

  /* ── Toggle item price visibility ── */
  const handleToggleItemPrice = useCallback(async (item) => {
    const nextVal = !(item.show_prices_to_public !== false);
    await handleSave(item._id, { show_prices_to_public: nextVal });
  }, [handleSave]);

  /* ── Filtered view ── */
  const filtered = items.filter((it) =>
    it.name?.toLowerCase().includes(search.toLowerCase()) ||
    it.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="mm-root">
      {/* ── Header ── */}
      <div className="mm-header">
        <div className="mm-header-left">
          <button className="mm-back-btn" onClick={() => navigate('/admin')} aria-label="Back to dashboard">
            <ArrowLeft size={16} />
          </button>
          <div className="mm-header-icon">
            <ChefHat size={22} />
          </div>
          <div>
            <h1 className="mm-title">Menu Manager</h1>
            <p className="mm-subtitle">{meta.total} items · Inline edit prices &amp; images</p>
          </div>
        </div>
        <button className="mm-refresh-btn" onClick={() => fetchItems(page)} disabled={loading} title="Refresh">
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* ── Price Visibility Master Toggle ── */}
      <div className="mm-toggle-card">
        <div className="mm-toggle-info">
          <div className="mm-toggle-icon-wrap" style={{ background: priceVisible ? '#D4A017' : '#374151' }}>
            {priceVisible ? <Eye size={18} color="#fff" /> : <EyeOff size={18} color="#fff" />}
          </div>
          <div>
            <p className="mm-toggle-label">Display Prices to Customers</p>
            <p className="mm-toggle-hint">
              {priceVisible
                ? 'Prices are currently visible on the customer menu.'
                : 'All price tags are hidden from the customer-facing menu.'}
            </p>
          </div>
        </div>
        <button
          id="price-visibility-toggle-btn"
          className={`mm-master-toggle ${priceVisible ? 'mm-toggle-on' : 'mm-toggle-off'}`}
          onClick={handlePriceToggle}
          disabled={toggleLoading}
          aria-label={priceVisible ? 'Hide prices' : 'Show prices'}
        >
          {toggleLoading
            ? <Loader2 size={20} className="spin" />
            : priceVisible
              ? <ToggleRight size={36} />
              : <ToggleLeft size={36} />
          }
          <span>{priceVisible ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="mm-search-wrap">
        <Search size={15} className="mm-search-icon" />
        <input
          id="mm-search-input"
          type="text"
          className="mm-search"
          placeholder="Search by name or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="mm-search-clear" onClick={() => setSearch('')}><X size={13} /></button>
        )}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="mm-loading">
          <Loader2 size={28} className="spin" style={{ color: '#D4A017' }} />
          <span>Loading menu…</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div className="mm-empty">
          <AlertCircle size={36} style={{ color: '#D4A017', opacity: 0.6 }} />
          <p>No items found{search ? ` for "${search}"` : ''}.</p>
        </div>
      )}

      {/* ── Items Grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="mm-grid">
          {filtered.map((item) => (
            <div key={item._id} className={`mm-card ${!item.available ? 'mm-card-unavailable' : ''}`} id={`mm-item-${item._id}`}>

              {/* Image Editor */}
              <div className="mm-card-img-col">
                <ImageEditor item={item} onSave={handleSave} saving={savingId === item._id} />
              </div>

              {/* Content */}
              <div className="mm-card-body">
                <div className="mm-card-top">
                  <p className="mm-item-name">{item.name}</p>
                  <div className="mm-item-badges">
                    {item.isVeg
                      ? <Badge color="#059669" bg="#ECFDF5"><Leaf size={9} /> Veg</Badge>
                      : <Badge color="#DC2626" bg="#FEF2F2">● Non-Veg</Badge>
                    }
                    {item.isBestseller && <Badge color="#D97706" bg="#FEF3C7"><Star size={9} /> Best</Badge>}
                    {!item.available && <Badge color="#6B7280" bg="#F3F4F6">Unavailable</Badge>}
                  </div>
                </div>

                <p className="mm-item-cat">
                  <span>{item.category?.icon}</span> {item.category?.name}
                  &nbsp;·&nbsp;
                  <Clock size={10} style={{ verticalAlign: 'middle' }} /> {item.preparationTime || 10} min
                </p>

                {/* Price editor */}
                <div className="mm-field-row">
                  <DollarSign size={12} style={{ color: '#D4A017' }} />
                  <PriceEditor item={item} onSave={handleSave} saving={savingId === item._id} />
                </div>

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="mm-item-tags">
                    <Tag size={10} style={{ color: '#888' }} />
                    {item.tags.slice(0, 4).map((t) => (
                      <span key={t} className="mm-tag">#{t}</span>
                    ))}
                  </div>
                )}

                {/* Toggle controls row */}
                <div className="mm-toggle-row">
                  <button
                    id={`mm-avail-${item._id}`}
                    className={`mm-chip-toggle ${item.available ? 'mm-chip-on' : 'mm-chip-off'}`}
                    onClick={() => handleToggleAvailable(item)}
                    disabled={savingId === item._id}
                    title={item.available ? 'Mark as unavailable' : 'Mark as available'}
                  >
                    {savingId === item._id ? <Loader2 size={11} className="spin" /> : item.available ? <Check size={11} /> : <X size={11} />}
                    {item.available ? 'Available' : 'Unavailable'}
                  </button>
                  <button
                    id={`mm-best-${item._id}`}
                    className={`mm-chip-toggle ${item.isBestseller ? 'mm-chip-star' : 'mm-chip-off'}`}
                    onClick={() => handleToggleBestseller(item)}
                    disabled={savingId === item._id}
                    title="Toggle bestseller"
                  >
                    <Star size={11} />
                    Bestseller
                  </button>
                  <button
                    id={`mm-price-vis-${item._id}`}
                    className={`mm-chip-toggle ${item.show_prices_to_public !== false ? 'mm-chip-on' : 'mm-chip-off'}`}
                    onClick={() => handleToggleItemPrice(item)}
                    disabled={savingId === item._id}
                    title={item.show_prices_to_public !== false ? 'Hide price from customers' : 'Show price to customers'}
                  >
                    {item.show_prices_to_public !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                    {item.show_prices_to_public !== false ? 'Price Visible' : 'Price Hidden'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && meta.pages > 1 && (
        <div className="mm-pagination">
          {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`mm-page-btn ${p === page ? 'mm-page-active' : ''}`}
              onClick={() => fetchItems(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
