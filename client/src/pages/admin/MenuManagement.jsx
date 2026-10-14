import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Trash2,
  Edit3,
  UploadCloud,
  CheckCircle2,
  X,
  FolderPlus,
  RefreshCw,
  ArrowLeft,
  Utensils,
  Sparkles,
  ChefHat,
  Leaf,
  Eye,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../../utils/resolveImageUrl';

/* ─── Reusable Field Components ────────────────────────────── */
const FieldLabel = ({ children, required }) => (
  <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">
    {children}
    {required && <span className="text-rose-500 ml-0.5">*</span>}
  </label>
);

const FieldInput = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900
      placeholder-stone-400 text-sm shadow-sm
      focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition ${className}`}
  />
);

const FieldTextarea = ({ className = '', ...props }) => (
  <textarea
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900
      placeholder-stone-400 text-sm shadow-sm resize-none
      focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition ${className}`}
  />
);

const FieldSelect = ({ className = '', accent = 'amber', ...props }) => (
  <select
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900
      text-sm shadow-sm
      focus:outline-none focus:ring-2 focus:ring-${accent}-500/20 focus:border-${accent}-500 transition ${className}`}
  />
);

/* ─── Card wrapper ──────────────────────────────────────────── */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-stone-200 shadow-sm rounded-2xl ${className}`}>
    {children}
  </div>
);

/* ─── Drag-and-Drop Image Dropzone ─────────────────────────── */
function Dropzone({ preview, onFile, onClear, inputId }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]);
      }}
      onClick={() => document.getElementById(inputId)?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
        ${dragging
          ? 'border-amber-500 bg-amber-50'
          : preview
          ? 'border-emerald-400 bg-emerald-50/40'
          : 'border-stone-200 hover:border-amber-400 bg-stone-50'
        }`}
    >
      <input
        type="file"
        id={inputId}
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
      {preview ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={preview}
            alt="Preview"
            className="w-28 h-20 object-cover rounded-xl border border-stone-200 shadow-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700">&#10003; Image selected</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-1 text-stone-400 hover:text-rose-600 rounded transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-1">
          <UploadCloud className="text-amber-500" size={28} />
          <p className="text-sm font-semibold text-stone-700">Click to browse or drag &amp; drop</p>
          <p className="text-xs text-stone-400">PNG, JPG, WEBP, SVG — up to 10 MB</p>
        </div>
      )}
    </div>
  );
}

/* ─── Panel header helper ───────────────────────────────────── */
function PanelHeader({ icon, title, subtitle, iconBg }) {
  return (
    <div className={`flex items-center gap-3 pb-5 mb-5 border-b border-stone-100`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-stone-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState('add');
  const [items, setItems]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Panel A — Add Item
  const [addName, setAddName]         = useState('');
  const [addPrice, setAddPrice]       = useState('');
  const [addDesc, setAddDesc]         = useState('');
  const [addCatId, setAddCatId]       = useState('');
  const [addIsVeg, setAddIsVeg]       = useState(false);
  const [addAvailable, setAddAvailable] = useState(true);
  const [addFile, setAddFile]         = useState(null);
  const [addPreview, setAddPreview]   = useState('');
  const [addUrl, setAddUrl]           = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Add Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);

  // Panel B — Remove Item
  const [removeId, setRemoveId] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Panel C — Update Item
  const [updateId, setUpdateId]               = useState('');
  const [updateName, setUpdateName]           = useState('');
  const [updatePrice, setUpdatePrice]         = useState('');
  const [updateDesc, setUpdateDesc]           = useState('');
  const [updateCatId, setUpdateCatId]         = useState('');
  const [updateIsVeg, setUpdateIsVeg]         = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(true);
  const [updateFile, setUpdateFile]           = useState(null);
  const [updatePreview, setUpdatePreview]     = useState('');
  const [updateUrl, setUpdateUrl]             = useState('');
  const [savingUpdate, setSavingUpdate]       = useState(false);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        axiosInstance.get('/admin/menu/items').catch(() => axiosInstance.get('/menu?limit=200')),
        axiosInstance.get('/admin/menu/categories').catch(() => axiosInstance.get('/menu/categories')),
      ]);
      const fetchedItems = itemsRes.data?.data || [];
      const fetchedCats  = catsRes.data?.data  || [];
      setItems(fetchedItems);
      setCategories(fetchedCats);
      if (fetchedCats.length > 0 && !addCatId) {
        setAddCatId(fetchedCats[0].id || fetchedCats[0]._id);
      }
    } catch {
      toast.error('Could not load menu data from server');
    } finally {
      setLoading(false);
    }
  }, [addCatId]);

  useEffect(() => {
    document.title = 'Menu Management — Dood Cafe Admin';
    fetchData();
  }, [fetchData]);

  /* ── Select item for Update ── */
  const handleSelectUpdate = (id) => {
    setUpdateId(id);
    const f = items.find((i) => (i.id || i._id) === id);
    if (f) {
      setUpdateName(f.name || '');
      setUpdatePrice(f.price !== undefined ? String(f.price) : '');
      setUpdateDesc(f.description || '');
      setUpdateCatId(
        f.categoryId ||
        (typeof f.category === 'object' ? f.category?.id || f.category?._id : f.category) ||
        ''
      );
      setUpdateIsVeg(Boolean(f.isVeg));
      setUpdateAvailable(f.available !== undefined ? Boolean(f.available) : true);
      setUpdateFile(null);
      setUpdatePreview('');
      setUpdateUrl(f.image || f.imageUrl || '');
    }
  };

  /* ── Add Category ── */
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return toast.error('Category name is required');
    setSubmittingCat(true);
    try {
      const res = await axiosInstance.post('/admin/menu/add-category', {
        name: newCatName.trim(),
        icon: newCatIcon.trim() || '',
      });
      const created = res.data?.data;
      toast.success(`Category "${newCatName.trim()}" created!`);
      setNewCatName('');
      setNewCatIcon('');
      const catsRes = await axiosInstance
        .get('/admin/menu/categories')
        .catch(() => axiosInstance.get('/menu/categories'));
      const fresh = catsRes.data?.data || [];
      setCategories(fresh);
      if (created) setAddCatId(created.id || created._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    } finally {
      setSubmittingCat(false);
    }
  };

  /* ── Add Item ── */
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!addName.trim()) return toast.error('Item name is required');
    if (!addPrice || isNaN(parseFloat(addPrice))) return toast.error('Valid price is required');
    setSubmittingAdd(true);
    try {
      const fd = new FormData();
      fd.append('name', addName.trim());
      fd.append('price', parseFloat(addPrice));
      fd.append('description', addDesc.trim());
      fd.append('categoryId', addCatId || (categories[0]?.id || categories[0]?._id));
      fd.append('isVeg', addIsVeg);
      fd.append('available', addAvailable);
      if (addFile) {
        fd.append('image', addFile);
      } else if (addUrl.trim()) {
        fd.append('imageUrl', addUrl.trim());
        fd.append('image', addUrl.trim());
      }
      const res = await axiosInstance.post('/admin/menu/add-item', fd);
      toast.success(res.data?.message || `"${addName}" added!`);
      setAddName(''); setAddPrice(''); setAddDesc('');
      setAddFile(null); setAddPreview(''); setAddUrl('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmittingAdd(false);
    }
  };

  /* ── Remove Item ── */
  const handleRemoveItem = async () => {
    if (!removeId) return toast.error('Select an item to delete');
    const item = items.find((i) => (i.id || i._id) === removeId);
    const name = item?.name || 'this item';
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await axiosInstance.delete(`/admin/menu/remove-item/${removeId}`);
      toast.success(res.data?.message || `"${name}" deleted.`);
      setItems((prev) => prev.filter((i) => (i.id || i._id) !== removeId));
      setRemoveId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Update Item ── */
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!updateId) return toast.error('Select an item to update');
    if (!updateName.trim()) return toast.error('Name is required');
    if (!updatePrice || isNaN(parseFloat(updatePrice))) return toast.error('Valid price is required');
    setSavingUpdate(true);
    try {
      const fd = new FormData();
      fd.append('name', updateName.trim());
      fd.append('price', parseFloat(updatePrice));
      fd.append('description', updateDesc.trim());
      fd.append('categoryId', updateCatId);
      fd.append('isVeg', updateIsVeg);
      fd.append('available', updateAvailable);
      if (updateFile) {
        fd.append('image', updateFile);
      } else if (updateUrl.trim()) {
        fd.append('imageUrl', updateUrl.trim());
        fd.append('image', updateUrl.trim());
      }
      const res = await axiosInstance.put(`/admin/menu/update-item/${updateId}`, fd);
      const updated = res.data?.data;
      toast.success(res.data?.message || `"${updateName}" updated!`);
      if (updated) setItems((prev) => prev.map((i) => (i.id || i._id) === updateId ? updated : i));
      setUpdateFile(null);
      setUpdatePreview('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item');
    } finally {
      setSavingUpdate(false);
    }
  };

  const selectedRemoveItem = items.find((i) => (i.id || i._id) === removeId);
  const selectedUpdateItem  = items.find((i) => (i.id || i._id) === updateId);

  /* ── Tab definitions ── */
  const TABS = [
    {
      key: 'add',
      label: 'Add Item',
      icon: <PlusCircle size={15} />,
      activeClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
    },
    {
      key: 'remove',
      label: 'Remove Item',
      icon: <Trash2 size={15} />,
      activeClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
    },
    {
      key: 'update',
      label: 'Update Item',
      icon: <Edit3 size={15} />,
      activeClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    },
  ];

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen bg-stone-50">

      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4
          flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700
                text-xs font-semibold mb-1 transition"
            >
              <ArrowLeft size={13} /> Back to Live Stream
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900
                flex items-center gap-2">
                <ChefHat className="text-amber-500" size={22} />
                Menu Management
              </h1>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1
                rounded-full border border-amber-200 whitespace-nowrap">
                PostgreSQL Sync
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-0.5 hidden sm:block">
              Add new dishes, remove existing items, and update prices in real time
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg
                bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 transition"
            >
              <RefreshCw
                size={13}
                className={loading ? 'animate-spin text-amber-500' : 'text-stone-500'}
              />
              Sync DB
            </button>
            <Link
              to="/menu"
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg
                bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition"
            >
              <Eye size={13} /> View Live Menu
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-3 sm:flex sm:w-auto gap-1.5
          bg-white border border-stone-200 shadow-sm rounded-2xl p-1.5">
          {TABS.map(({ key, label, icon, activeClass }) => (
            <button
              key={key}
              id={`tab-btn-${key}-item`}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2
                px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all
                focus:outline-none focus:ring-2 focus:ring-amber-500/20
                ${activeTab === key
                  ? activeClass
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                }`}
            >
              {icon}
              <span className="hidden xs:inline">{label}</span>
              <span className="xs:hidden">
                {key === 'add' ? 'Add' : key === 'remove' ? 'Remove' : 'Edit'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20">

        {/* ════ PANEL A: ADD ITEM ════ */}
        {activeTab === 'add' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Add Dish Form */}
            <Card className="lg:col-span-2 p-5 md:p-8">
              <PanelHeader
                icon={<PlusCircle className="text-amber-500" size={20} />}
                iconBg="bg-amber-50"
                title="Add New Dish to Menu"
                subtitle="Inserts a new row into the PostgreSQL `menu_items` table"
              />

              <form onSubmit={handleAddItem} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Item Name</FieldLabel>
                    <FieldInput
                      id="add-item-name"
                      required
                      placeholder="e.g. Truffle Cheese Fries"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Item Price (&#8377;)</FieldLabel>
                    <FieldInput
                      id="add-item-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 199"
                      value={addPrice}
                      onChange={(e) => setAddPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Category</FieldLabel>
                  <FieldSelect
                    id="add-item-category"
                    value={addCatId}
                    onChange={(e) => setAddCatId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.icon ? `${c.icon} ` : ''}{c.name}
                      </option>
                    ))}
                  </FieldSelect>
                </div>

                <div>
                  <FieldLabel>Description</FieldLabel>
                  <FieldTextarea
                    id="add-item-description"
                    rows={3}
                    placeholder="Crispy golden snacks with signature spices and dipping sauce..."
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-5 py-3 border-y border-stone-100">
                  <label className="flex items-center gap-2 cursor-pointer text-sm
                    text-stone-700 font-medium select-none">
                    <input
                      type="checkbox"
                      id="add-item-isveg"
                      checked={addIsVeg}
                      onChange={(e) => setAddIsVeg(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded
                        focus:ring-2 focus:ring-amber-500/20"
                    />
                    <Leaf size={14} className="text-emerald-500" />
                    Mark as Vegetarian
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm
                    text-stone-700 font-medium select-none">
                    <input
                      type="checkbox"
                      id="add-item-available"
                      checked={addAvailable}
                      onChange={(e) => setAddAvailable(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded
                        focus:ring-2 focus:ring-amber-500/20"
                    />
                    <ChefHat size={14} className="text-amber-500" />
                    Available in Kitchen
                  </label>
                </div>

                <div>
                  <FieldLabel>Item Image (Dropzone / File Upload)</FieldLabel>
                  <Dropzone
                    preview={addPreview}
                    onFile={(f) => { setAddFile(f); setAddPreview(URL.createObjectURL(f)); }}
                    onClear={() => { setAddFile(null); setAddPreview(''); }}
                    inputId="add-file-input"
                  />
                  <div className="mt-2">
                    <FieldInput
                      placeholder="Or paste image path / URL  e.g. /src/images/Burger/veg.png"
                      value={addUrl}
                      onChange={(e) => setAddUrl(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-add-item-btn"
                  disabled={submittingAdd}
                  className="w-full py-3.5 rounded-xl font-bold text-white
                    bg-amber-500 hover:bg-amber-600 shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-500/20
                    transition-all flex items-center justify-center gap-2
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingAdd ? (
                    <><RefreshCw className="animate-spin" size={16} /> Adding to Database&hellip;</>
                  ) : (
                    <><CheckCircle2 size={17} /> Add Dish to Menu</>
                  )}
                </button>
              </form>
            </Card>

            {/* Add Category Sidebar */}
            <Card className="p-5 sm:p-6 h-fit">
              <PanelHeader
                icon={<FolderPlus className="text-amber-500" size={18} />}
                iconBg="bg-amber-50"
                title="Add New Category"
                subtitle="Extends the `categories` table catalog"
              />

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <FieldLabel required>Category Name</FieldLabel>
                  <FieldInput
                    id="new-category-name"
                    required
                    placeholder="e.g. Waffles & Crepes"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Emoji / Icon</FieldLabel>
                  <FieldInput
                    id="new-category-icon"
                    placeholder="e.g. 🧇"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  id="submit-add-category-btn"
                  disabled={submittingCat}
                  className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider
                    text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200
                    focus:outline-none focus:ring-2 focus:ring-amber-500/20
                    transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {submittingCat ? (
                    <><RefreshCw className="animate-spin" size={12} /> Seeding&hellip;</>
                  ) : (
                    <><Sparkles size={12} /> Instant Add Category</>
                  )}
                </button>
              </form>

              {categories.length > 0 && (
                <div className="mt-5 pt-4 border-t border-stone-100">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                    Active Categories ({categories.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
                    {categories.map((c) => (
                      <span
                        key={c.id || c._id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                          bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium"
                      >
                        {c.icon && <span>{c.icon}</span>}
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ════ PANEL B: REMOVE ITEM ════ */}
        {activeTab === 'remove' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-5 md:p-8">
              <PanelHeader
                icon={<Trash2 className="text-rose-600" size={20} />}
                iconBg="bg-rose-50"
                title="Remove Dish from Database"
                subtitle="Permanently purges the selected row from `menu_items`"
              />

              <div className="space-y-5">
                <div>
                  <FieldLabel required>Select Target Dish to Remove</FieldLabel>
                  <FieldSelect
                    id="remove-item-picker"
                    value={removeId}
                    onChange={(e) => setRemoveId(e.target.value)}
                    accent="rose"
                    className="focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="">&#8212; Choose a dish ({items.length} available) &#8212;</option>
                    {items.map((item) => (
                      <option key={item.id || item._id} value={item.id || item._id}>
                        {item.name} &#8212; &#8377;{item.price}
                      </option>
                    ))}
                  </FieldSelect>
                </div>

                {selectedRemoveItem && (
                  <div className="flex items-center gap-4 p-4 rounded-xl
                    border border-rose-200 bg-rose-50/40">
                    {(selectedRemoveItem.image || selectedRemoveItem.imageUrl) ? (
                      <img
                        src={resolveImageUrl(selectedRemoveItem.image || selectedRemoveItem.imageUrl)}
                        alt={selectedRemoveItem.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl
                          border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center
                        justify-center shrink-0">
                        <Utensils className="text-stone-400" size={22} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 truncate">{selectedRemoveItem.name}</p>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                        {selectedRemoveItem.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="font-extrabold text-stone-900">
                          &#8377;{selectedRemoveItem.price}
                        </span>
                        {selectedRemoveItem.isVeg && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100
                            text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                            VEG
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  id="permanently-delete-dish-btn"
                  disabled={!removeId || deleting}
                  onClick={handleRemoveItem}
                  className="w-full py-3.5 rounded-xl font-bold text-white
                    bg-rose-600 hover:bg-rose-700 shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-rose-500/20
                    transition-all flex items-center justify-center gap-2
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <><RefreshCw className="animate-spin" size={16} /> Deleting from PostgreSQL&hellip;</>
                  ) : (
                    <><Trash2 size={16} /> Permanently Delete Dish</>
                  )}
                </button>
                <p className="text-stone-400 text-[11px] text-center">
                  Triggers a confirmation prompt then executes Sequelize .destroy() with no page reload
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ════ PANEL C: UPDATE ITEM ════ */}
        {activeTab === 'update' && (
          <div className="max-w-3xl mx-auto">
            <Card className="p-5 md:p-8">
              <PanelHeader
                icon={<Edit3 className="text-blue-600" size={20} />}
                iconBg="bg-blue-50"
                title="Update Item Overrides"
                subtitle="Select an item then modify its name, price, description, or image"
              />

              <div className="mb-6">
                <FieldLabel required>Select Dish to Edit</FieldLabel>
                <FieldSelect
                  id="update-item-picker"
                  value={updateId}
                  onChange={(e) => handleSelectUpdate(e.target.value)}
                  accent="blue"
                  className="focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">
                    &#8212; Choose an item to edit ({items.length} items) &#8212;
                  </option>
                  {items.map((item) => (
                    <option key={item.id || item._id} value={item.id || item._id}>
                      {item.name} &#8212; &#8377;{item.price}
                    </option>
                  ))}
                </FieldSelect>
              </div>

              {selectedUpdateItem ? (
                <form onSubmit={handleUpdateItem} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Item Name</FieldLabel>
                      <FieldInput
                        id="update-item-name"
                        required
                        value={updateName}
                        onChange={(e) => setUpdateName(e.target.value)}
                        className="focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <FieldLabel required>Item Price (&#8377;)</FieldLabel>
                      <FieldInput
                        id="update-item-price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={updatePrice}
                        onChange={(e) => setUpdatePrice(e.target.value)}
                        className="focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Category</FieldLabel>
                    <FieldSelect
                      id="update-item-category"
                      value={updateCatId}
                      onChange={(e) => setUpdateCatId(e.target.value)}
                      accent="blue"
                      className="focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.icon ? `${c.icon} ` : ''}{c.name}
                        </option>
                      ))}
                    </FieldSelect>
                  </div>

                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <FieldTextarea
                      id="update-item-description"
                      rows={3}
                      value={updateDesc}
                      onChange={(e) => setUpdateDesc(e.target.value)}
                      className="focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-5 py-3 border-y border-stone-100">
                    <label className="flex items-center gap-2 cursor-pointer text-sm
                      text-stone-700 font-medium select-none">
                      <input
                        type="checkbox"
                        id="update-item-isveg"
                        checked={updateIsVeg}
                        onChange={(e) => setUpdateIsVeg(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded
                          focus:ring-2 focus:ring-amber-500/20"
                      />
                      <Leaf size={14} className="text-emerald-500" />
                      Mark as Vegetarian
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm
                      text-stone-700 font-medium select-none">
                      <input
                        type="checkbox"
                        id="update-item-available"
                        checked={updateAvailable}
                        onChange={(e) => setUpdateAvailable(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded
                          focus:ring-2 focus:ring-amber-500/20"
                      />
                      <ChefHat size={14} className="text-amber-500" />
                      Available in Kitchen
                    </label>
                  </div>

                  <div>
                    <FieldLabel>Image Override (File Picker / URL)</FieldLabel>
                    <Dropzone
                      preview={updatePreview || resolveImageUrl(updateUrl)}
                      onFile={(f) => { setUpdateFile(f); setUpdatePreview(URL.createObjectURL(f)); }}
                      onClear={() => { setUpdateFile(null); setUpdatePreview(''); }}
                      inputId="update-file-input"
                    />
                    <div className="mt-2">
                      <FieldInput
                        placeholder="Or override asset URL  e.g. /src/images/Burger/classic-veg.png"
                        value={updateUrl}
                        onChange={(e) => setUpdateUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="save-dish-changes-btn"
                    disabled={savingUpdate}
                    className="w-full py-3.5 rounded-xl font-bold text-white
                      bg-blue-600 hover:bg-blue-700 shadow-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20
                      transition-all flex items-center justify-center gap-2
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingUpdate ? (
                      <><RefreshCw className="animate-spin" size={16} /> Updating PostgreSQL&hellip;</>
                    ) : (
                      <><CheckCircle2 size={17} /> Save Dish Changes</>
                    )}
                  </button>
                </form>
              ) : (
                <div className="py-16 text-center bg-stone-50 rounded-xl
                  border border-dashed border-stone-200">
                  <Utensils size={36} className="mx-auto text-stone-300 mb-3" />
                  <p className="text-sm font-medium text-stone-400">
                    Select an item from the picker above to begin editing
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

      </div>
    </main>
  );
}
