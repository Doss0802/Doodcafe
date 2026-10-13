import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChefHat, Edit3, Trash2, Check, X, Upload, RefreshCw,
  DollarSign, Leaf, Star, Clock, Tag,
  AlertCircle, Loader2, ShieldAlert, ArrowLeft, Plus,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import useMenuStore from '../../store/menuStore';
import toast from 'react-hot-toast';

/* ─── Badge Helper ─────────────────────────────────────────── */
function Badge({ children, color = '#D4A017', bg = '#FEF3C7' }) {
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, color, background: bg, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {children}
    </span>
  );
}

/* ─── Add / Update Menu Item Modal Component ─────────────────── */
function ItemFormModal({ itemToEdit = null, categories = [], onClose, onSaved }) {
  const isEditing = Boolean(itemToEdit?._id);

  const [name, setName] = useState(itemToEdit?.name || '');
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [price, setPrice] = useState(itemToEdit?.price != null ? String(itemToEdit.price) : '');
  const [category, setCategory] = useState(
    itemToEdit?.category?._id || itemToEdit?.category || categories[0]?._id || ''
  );
  const [preparationTime, setPreparationTime] = useState(itemToEdit?.preparationTime || 10);
  const [isVeg, setIsVeg] = useState(Boolean(itemToEdit?.isVeg));
  const [isBestseller, setIsBestseller] = useState(Boolean(itemToEdit?.isBestseller));
  const [tags, setTags] = useState(
    Array.isArray(itemToEdit?.tags)
      ? itemToEdit.tags.join(', ')
      : (itemToEdit?.tags || '')
  );

  const [dragActive, setDragActive] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(itemToEdit?.imageUrl || itemToEdit?.image || '');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0]._id);
    }
  }, [categories, category]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPG, PNG, WebP, GIF) are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!price || parseFloat(price) < 0) {
      toast.error('Please enter a valid price (>= 0)');
      return;
    }
    if (!category) {
      toast.error('Please select a category');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', parseFloat(price));
      formData.append('category', category);
      formData.append('preparationTime', parseInt(preparationTime, 10) || 10);
      formData.append('isVeg', isVeg);
      formData.append('isBestseller', isBestseller);
      formData.append('available', true);
      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (isEditing && imagePreview && !imagePreview.startsWith('blob:')) {
        formData.append('imageUrl', imagePreview);
      }

      let response;
      if (isEditing) {
        response = await axiosInstance.put(`/menu-items/${itemToEdit._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`✅ "${response.data.data?.name || name}" updated!`);
        onSaved(response.data.data, true);
      } else {
        response = await axiosInstance.post('/menu-items', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`🎉 "${response.data.data?.name || name}" added to menu!`);
        onSaved(response.data.data, false);
      }
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mm-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="mm-modal-header">
          <div className="mm-modal-title-group">
            <div className="mm-modal-icon-wrap">
              <ChefHat size={18} />
            </div>
            <div>
              <h3 className="mm-modal-title">
                {isEditing ? 'Update Menu Item' : 'Add New Menu Item'}
              </h3>
              <p className="mm-modal-sub">
                {isEditing
                  ? 'Modify item name, price, category or replacement dish photo'
                  : 'Create and publish a new dish to the digital cafe menu'}
              </p>
            </div>
          </div>
          <button className="mm-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mm-form">
          <div className="mm-form-grid">
            {/* Item Name */}
            <div className="mm-form-group full-col">
              <label className="mm-form-label">
                Dish / Item Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className="mm-form-input"
                placeholder="e.g. Double Truffle Crunch Burger"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Category Select */}
            <div className="mm-form-group">
              <label className="mm-form-label">
                Category <span className="req">*</span>
              </label>
              <select
                className="mm-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select category…</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon || '🍽️'} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Price */}
            <div className="mm-form-group">
              <label className="mm-form-label">
                Base Price (₹) <span className="req">*</span>
              </label>
              <div className="mm-input-prefix-wrap">
                <span className="mm-input-prefix">₹</span>
                <input
                  type="number"
                  className="mm-form-input mm-input-with-prefix"
                  placeholder="199"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Prep Time */}
            <div className="mm-form-group">
              <label className="mm-form-label">Prep Time (minutes)</label>
              <input
                type="number"
                className="mm-form-input"
                min="1"
                max="180"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div className="mm-form-group">
              <label className="mm-form-label">Tags (comma-separated)</label>
              <input
                type="text"
                className="mm-form-input"
                placeholder="crispy, spicy, loaded"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="mm-form-group full-col">
              <label className="mm-form-label">
                Description <span className="hint">({300 - description.length} chars left)</span>
              </label>
              <textarea
                className="mm-form-textarea"
                rows={3}
                placeholder="Handcrafted golden patty layered with crisp iceberg lettuce, melted cheddar, and secret house sauce..."
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Dietary & Highlight Badges */}
            <div className="mm-form-group full-col">
              <label className="mm-form-label">Dietary &amp; Highlights</label>
              <div className="mm-switches-row">
                <button
                  type="button"
                  className={`mm-pill-toggle ${isVeg ? 'mm-pill-veg' : 'mm-pill-nonveg'}`}
                  onClick={() => setIsVeg(!isVeg)}
                >
                  <Leaf size={13} />
                  <span>{isVeg ? 'Vegetarian' : 'Non-Vegetarian'}</span>
                </button>
                <button
                  type="button"
                  className={`mm-pill-toggle ${isBestseller ? 'mm-pill-best' : ''}`}
                  onClick={() => setIsBestseller(!isBestseller)}
                >
                  <Star size={13} />
                  <span>{isBestseller ? 'Bestseller ⭐' : 'Standard'}</span>
                </button>
              </div>
            </div>

            {/* Image File Drag-and-Drop Dropzone */}
            <div className="mm-form-group full-col">
              <label className="mm-form-label">
                Dish Photo <span className="hint">(Drag &amp; drop or click to replace)</span>
              </label>
              <div
                className={`mm-dropzone ${dragActive ? 'mm-dropzone-active' : ''} ${imagePreview ? 'mm-dropzone-has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                />
                {imagePreview ? (
                  <div className="mm-dropzone-preview">
                    <img src={imagePreview} alt="Preview" className="mm-dropzone-img" />
                    <div className="mm-dropzone-meta">
                      <p className="mm-dropzone-filename">{imageFile ? imageFile.name : (itemToEdit?.name || 'Current Image')}</p>
                      <p className="mm-dropzone-filesize">
                        {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : 'Active dish photo'}
                      </p>
                      <span className="mm-dropzone-replace-hint">Click or drop new file to replace</span>
                    </div>
                    <button
                      type="button"
                      className="mm-dropzone-remove-btn"
                      onClick={handleRemoveImage}
                      title="Remove image"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="mm-dropzone-placeholder">
                    <div className="mm-dropzone-icon">
                      <Upload size={24} />
                    </div>
                    <p className="mm-dropzone-prompt">
                      <strong>Drag and drop dish image here</strong>, or <span className="browse-link">browse</span>
                    </p>
                    <p className="mm-dropzone-subtext">JPG, PNG, WebP or GIF (up to 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="mm-modal-footer">
            <button
              type="button"
              className="btn btn-secondary mm-btn-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary mm-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>{isEditing ? 'Saving Changes…' : 'Saving Dish…'}</span>
                </>
              ) : isEditing ? (
                <>
                  <Check size={15} />
                  <span>Update Menu Item</span>
                </>
              ) : (
                <>
                  <Plus size={15} />
                  <span>Create Menu Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
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

  const {
    items,
    meta,
    setItems,
    addItem: addStoreItem,
    updateItem: updateStoreItem,
    removeItem: removeStoreItem,
  } = useMenuStore();

  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // null = Add, object = Update
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);

  /* ── Fetch categories for insertion & update form ── */
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/menu/categories');
      if (Array.isArray(data.data) && data.data.length > 0) {
        setCategories(data.data);
      }
    } catch {
      // fallback
    }
  }, []);

  /* ── Fetch menu items ── */
  const fetchItems = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/menu-items?page=${p}&limit=30`);
      setItems(data.data || [], { total: data.meta?.total || 0, pages: data.meta?.pages || 1 });
      setPage(p);
    } catch (err) {
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }, [setItems]);

  useEffect(() => {
    fetchCategories();
    fetchItems(1);
  }, [fetchCategories, fetchItems]);

  /* ── Item saved callback (Create / Update via Zustand 5 store) ── */
  const handleItemSaved = useCallback((savedItem, isEdit) => {
    if (isEdit) {
      updateStoreItem(savedItem);
    } else {
      addStoreItem(savedItem);
    }
  }, [updateStoreItem, addStoreItem]);

  /* ── Open Edit Modal ── */
  const handleOpenEdit = useCallback((item) => {
    setSelectedItem(item);
    setModalOpen(true);
  }, []);

  /* ── Remove Menu Item (connected to DELETE API & Zustand store) ── */
  const handleRemoveItem = async (item) => {
    const confirmed = window.confirm(`Are you sure you want to remove "${item.name}" from the menu?`);
    if (!confirmed) return;

    setDeletingId(item._id);
    try {
      await axiosInstance.delete(`/menu-items/${item._id}`);
      removeStoreItem(item._id);
      toast.success(`🗑️ "${item.name}" removed from menu`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove menu item');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Toggle availability ── */
  const handleToggleAvailable = useCallback(async (item) => {
    setSavingId(item._id);
    try {
      const nextAvailable = !item.available;
      const { data } = await axiosInstance.patch(`/menu-items/${item._id}`, { available: nextAvailable });
      updateStoreItem({ ...item, ...data.data });
      toast.success(nextAvailable ? 'Item marked as available' : 'Item marked as unavailable');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  }, [updateStoreItem]);

  /* ── Toggle bestseller ── */
  const handleToggleBestseller = useCallback(async (item) => {
    setSavingId(item._id);
    try {
      const nextBestseller = !item.isBestseller;
      const { data } = await axiosInstance.patch(`/menu-items/${item._id}`, { isBestseller: nextBestseller });
      updateStoreItem({ ...item, ...data.data });
      toast.success(nextBestseller ? 'Item marked as bestseller' : 'Bestseller status removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  }, [updateStoreItem]);



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
            <p className="mm-subtitle">{meta?.total || items.length} items · Live dish inventory &amp; updates</p>
          </div>
        </div>
        <div className="mm-header-actions">
          <button
            id="mm-open-create-btn"
            className="mm-create-btn"
            onClick={() => {
              setSelectedItem(null);
              setModalOpen(true);
            }}
            title="Add a new menu item"
          >
            <Plus size={15} />
            <span>Add New Menu Item</span>
          </button>
          <button className="mm-refresh-btn" onClick={() => fetchItems(page)} disabled={loading} title="Refresh">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>


      {/* ── Loading state ── */}
      {loading && (
        <div className="mm-loading">
          <Loader2 size={28} className="spin" style={{ color: '#D4A017' }} />
          <span>Loading menu items…</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && items.length === 0 && (
        <div className="mm-empty">
          <AlertCircle size={36} style={{ color: '#D4A017', opacity: 0.6 }} />
          <p>No menu items found. Add your first dish above.</p>
        </div>
      )}

      {/* ── Items Grid (Responsive fluid cards) ── */}
      {!loading && items.length > 0 && (
        <div className="mm-grid">
          {items.map((item) => (
            <div
              key={item._id}
              className={`mm-card ${!item.available ? 'mm-card-unavailable' : ''}`}
              id={`mm-item-${item._id}`}
            >
              {/* Image Preview */}
              <div className="mm-card-img-col">
                <div className="mm-thumb-wrap">
                  {item.imageUrl || item.image ? (
                    <img
                      src={item.imageUrl || item.image}
                      alt={item.name}
                      className="mm-thumb"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="mm-thumb-placeholder">
                      <span>{item.category?.icon || '🍽️'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Body */}
              <div className="mm-card-body">
                <div className="mm-card-top">
                  <p className="mm-item-name">{item.name}</p>
                  <div className="mm-item-badges">
                    {item.isVeg ? (
                      <Badge color="#059669" bg="#ECFDF5">
                        <Leaf size={9} /> Veg
                      </Badge>
                    ) : (
                      <Badge color="#DC2626" bg="#FEF2F2">
                        ● Non-Veg
                      </Badge>
                    )}
                    {item.isBestseller && (
                      <Badge color="#D97706" bg="#FEF3C7">
                        <Star size={9} /> Best
                      </Badge>
                    )}
                    {!item.available && (
                      <Badge color="#6B7280" bg="#F3F4F6">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="mm-item-cat">
                  <span>{item.category?.icon}</span> {item.category?.name}
                  &nbsp;·&nbsp;
                  <Clock size={10} style={{ verticalAlign: 'middle' }} /> {item.preparationTime || 10} min
                </p>

                {/* Price Display */}
                <div className="mm-field-row">
                  <DollarSign size={13} style={{ color: '#D4A017' }} />
                  <span className="mm-price-pill">₹{item.price}</span>
                  {item.description && (
                    <span className="mm-desc-preview" title={item.description}>
                      · {item.description}
                    </span>
                  )}
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

                {/* Toggle chips row: Availability & Bestseller */}
                <div className="mm-toggle-row">
                  <button
                    id={`mm-avail-${item._id}`}
                    className={`mm-chip-toggle ${item.available ? 'mm-chip-on' : 'mm-chip-off'}`}
                    onClick={() => handleToggleAvailable(item)}
                    disabled={savingId === item._id}
                    title={item.available ? 'Mark as unavailable' : 'Mark as available'}
                  >
                    {savingId === item._id ? (
                      <Loader2 size={11} className="spin" />
                    ) : item.available ? (
                      <Check size={11} />
                    ) : (
                      <X size={11} />
                    )}
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
                </div>

                {/* Mobile-optimized Action Buttons: Update Item & Remove Item */}
                <div className="mm-card-actions">
                  <button
                    type="button"
                    id={`mm-update-${item._id}`}
                    className="mm-btn-update"
                    onClick={() => handleOpenEdit(item)}
                    title={`Update ${item.name}`}
                  >
                    <Edit3 size={14} />
                    <span>Update Item</span>
                  </button>
                  <button
                    type="button"
                    id={`mm-remove-${item._id}`}
                    className="mm-btn-remove"
                    onClick={() => handleRemoveItem(item)}
                    disabled={deletingId === item._id}
                    title={`Remove ${item.name}`}
                  >
                    {deletingId === item._id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    <span>{deletingId === item._id ? 'Removing…' : 'Remove Item'}</span>
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

      {/* ── Add / Update Modal (Dynamically reused) ── */}
      {modalOpen && (
        <ItemFormModal
          itemToEdit={selectedItem}
          categories={categories}
          onClose={() => {
            setModalOpen(false);
            setSelectedItem(null);
          }}
          onSaved={handleItemSaved}
        />
      )}
    </main>
  );
}
