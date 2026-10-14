import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Trash2,
  Edit3,
  UploadCloud,
  CheckCircle2,
  X,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  ArrowLeft,
  Utensils,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState('add'); // 'add' | 'remove' | 'update'
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Panel A: Add Item State ──
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addIsVeg, setAddIsVeg] = useState(false);
  const [addAvailable, setAddAvailable] = useState(true);
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState('');
  const [addImageUrl, setAddImageUrl] = useState('');
  const [isAddDragging, setIsAddDragging] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Panel A: Add Category Action Box State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍽️');
  const [submittingCat, setSubmittingCat] = useState(false);

  // ── Panel B: Remove Item State ──
  const [removeId, setRemoveId] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Panel C: Update Item State ──
  const [updateId, setUpdateId] = useState('');
  const [updateName, setUpdateName] = useState('');
  const [updatePrice, setUpdatePrice] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateCategoryId, setUpdateCategoryId] = useState('');
  const [updateIsVeg, setUpdateIsVeg] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(true);
  const [updateImageFile, setUpdateImageFile] = useState(null);
  const [updateImagePreview, setUpdateImagePreview] = useState('');
  const [updateImageUrl, setUpdateImageUrl] = useState('');
  const [isUpdateDragging, setIsUpdateDragging] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Fetch all items and categories
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        axiosInstance.get('/admin/menu/items').catch(() => axiosInstance.get('/menu?limit=200')),
        axiosInstance.get('/admin/menu/categories').catch(() => axiosInstance.get('/menu/categories')),
      ]);

      const fetchedItems = itemsRes.data?.data || [];
      const fetchedCats = catsRes.data?.data || [];

      setItems(fetchedItems);
      setCategories(fetchedCats);

      if (fetchedCats.length > 0 && !addCategoryId) {
        setAddCategoryId(fetchedCats[0].id || fetchedCats[0]._id);
      }
    } catch (err) {
      console.error('Failed to load menu management data:', err);
      toast.error('Could not load menu items or categories from server');
    } finally {
      setLoading(false);
    }
  }, [addCategoryId]);

  useEffect(() => {
    document.title = 'Menu Management — Dood Cafe Admin';
    fetchData();
  }, [fetchData]);

  // Handle Add Item Image selection
  const handleAddFileSelect = (file) => {
    if (!file) return;
    setAddImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAddImagePreview(objectUrl);
  };

  // Handle Update Item Image selection
  const handleUpdateFileSelect = (file) => {
    if (!file) return;
    setUpdateImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUpdateImagePreview(objectUrl);
  };

  // Pre-populate Panel C when an item is chosen
  const handleSelectUpdateItem = (id) => {
    setUpdateId(id);
    const found = items.find((i) => (i.id || i._id) === id);
    if (found) {
      setUpdateName(found.name || '');
      setUpdatePrice(found.price !== undefined ? found.price.toString() : '');
      setUpdateDescription(found.description || '');
      const catId = found.categoryId || (typeof found.category === 'object' ? found.category?.id || found.category?._id : found.category) || '';
      setUpdateCategoryId(catId);
      setUpdateIsVeg(Boolean(found.isVeg));
      setUpdateAvailable(found.available !== undefined ? Boolean(found.available) : true);
      setUpdateImageFile(null);
      setUpdateImagePreview('');
      setUpdateImageUrl(found.image || found.imageUrl || '');
    } else {
      setUpdateName('');
      setUpdatePrice('');
      setUpdateDescription('');
      setUpdateCategoryId('');
      setUpdateImageUrl('');
      setUpdateImagePreview('');
    }
  };

  // ── Handler: Add New Category ──
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setSubmittingCat(true);
    try {
      const res = await axiosInstance.post('/admin/menu/add-category', {
        name: newCatName.trim(),
        icon: newCatIcon.trim() || '🍽️',
      });

      const createdCat = res.data?.data;
      toast.success(`Category "${newCatName.trim()}" created successfully!`);
      setNewCatName('');
      setNewCatIcon('🍽️');

      // Refresh categories list and select the newly created one
      const catsRes = await axiosInstance.get('/admin/menu/categories').catch(() => axiosInstance.get('/menu/categories'));
      const freshCats = catsRes.data?.data || [];
      setCategories(freshCats);
      if (createdCat) {
        setAddCategoryId(createdCat.id || createdCat._id);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to add category';
      toast.error(msg);
    } finally {
      setSubmittingCat(false);
    }
  };

  // ── Handler: Add Item Submit (Panel A) ──
  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!addPrice || isNaN(parseFloat(addPrice))) {
      toast.error('Valid item price is required');
      return;
    }

    setSubmittingAdd(true);
    try {
      const formData = new FormData();
      formData.append('name', addName.trim());
      formData.append('price', parseFloat(addPrice));
      formData.append('description', addDescription.trim());
      formData.append('categoryId', addCategoryId || (categories[0]?.id || categories[0]?._id));
      formData.append('isVeg', addIsVeg);
      formData.append('available', addAvailable);

      if (addImageFile) {
        formData.append('image', addImageFile);
      } else if (addImageUrl.trim()) {
        formData.append('imageUrl', addImageUrl.trim());
        formData.append('image', addImageUrl.trim());
      }

      const res = await axiosInstance.post('/admin/menu/add-item', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data?.message || `"${addName}" added to the menu!`);

      // Reset form
      setAddName('');
      setAddPrice('');
      setAddDescription('');
      setAddImageFile(null);
      setAddImagePreview('');
      setAddImageUrl('');

      // Refresh items list
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to add item';
      toast.error(msg);
    } finally {
      setSubmittingAdd(false);
    }
  };

  // ── Handler: Remove Item Submit (Panel B) ──
  const handleRemoveItem = async () => {
    if (!removeId) {
      toast.error('Please select an item to delete');
      return;
    }

    const itemToDelete = items.find((i) => (i.id || i._id) === removeId);
    const itemName = itemToDelete?.name || 'this item';

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${itemName}" from the cafe database? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await axiosInstance.delete(`/admin/menu/remove-item/${removeId}`);
      toast.success(res.data?.message || `"${itemName}" permanently deleted.`);

      // Remove from local items state instantly without full page reload
      setItems((prev) => prev.filter((i) => (i.id || i._id) !== removeId));
      setRemoveId('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete item';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Handler: Update Item Submit (Panel C) ──
  const handleUpdateItemSubmit = async (e) => {
    e.preventDefault();
    if (!updateId) {
      toast.error('Please select an item to update');
      return;
    }
    if (!updateName.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!updatePrice || isNaN(parseFloat(updatePrice))) {
      toast.error('Valid price is required');
      return;
    }

    setSavingUpdate(true);
    try {
      const formData = new FormData();
      formData.append('name', updateName.trim());
      formData.append('price', parseFloat(updatePrice));
      formData.append('description', updateDescription.trim());
      formData.append('categoryId', updateCategoryId);
      formData.append('isVeg', updateIsVeg);
      formData.append('available', updateAvailable);

      if (updateImageFile) {
        formData.append('image', updateImageFile);
      } else if (updateImageUrl.trim()) {
        formData.append('imageUrl', updateImageUrl.trim());
        formData.append('image', updateImageUrl.trim());
      }

      const res = await axiosInstance.put(`/admin/menu/update-item/${updateId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedItem = res.data?.data;
      toast.success(res.data?.message || `"${updateName}" updated successfully!`);

      // Update in local items state immediately
      if (updatedItem) {
        setItems((prev) =>
          prev.map((i) => ((i.id || i._id) === updateId ? updatedItem : i))
        );
      }

      setUpdateImageFile(null);
      setUpdateImagePreview('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update item';
      toast.error(msg);
    } finally {
      setSavingUpdate(false);
    }
  };

  const selectedRemoveItem = items.find((i) => (i.id || i._id) === removeId);
  const selectedUpdateItem = items.find((i) => (i.id || i._id) === updateId);

  return (
    <main className="adm-page">
      <div className="container max-w-6xl mx-auto px-4">
        {/* ── Top Header Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/admin"
                className="text-amber-500 hover:text-amber-600 font-semibold text-sm flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Live Stream
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
                Menu Management
              </h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-300">
                PostgreSQL Relational Sync
              </span>
            </div>
            <p className="text-stone-500 text-sm mt-1">
              Add new dishes, remove existing menu items, and update prices & descriptions in real time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2"
              title="Refresh menu catalog"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Sync DB
            </button>
            <Link
              to="/menu"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary-sm inline-flex items-center gap-1.5 text-sm"
            >
              <Utensils size={14} /> View Live Menu
            </Link>
          </div>
        </div>

        {/* ── Master Tabs Navigation Controller ── */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-1.5 flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            id="tab-btn-add-item"
            onClick={() => setActiveTab('add')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'add'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <PlusCircle size={17} />
            <span>Panel A: Add Item</span>
          </button>

          <button
            type="button"
            id="tab-btn-remove-item"
            onClick={() => setActiveTab('remove')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'remove'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Trash2 size={17} />
            <span>Panel B: Remove Item</span>
          </button>

          <button
            type="button"
            id="tab-btn-update-item"
            onClick={() => setActiveTab('update')}
            className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'update'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Edit3 size={17} />
            <span>Panel C: Update Item</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            PANEL A: [Add Item Form View]
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'add' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Add Dish Form (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
              <div className="border-b border-stone-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <PlusCircle className="text-amber-500" size={20} />
                  Add New Dish to Menu
                </h2>
                <p className="text-stone-500 text-xs mt-0.5">
                  Fills and validates row parameters inside PostgreSQL 'menu_items' table
                </p>
              </div>

              <form onSubmit={handleAddItemSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="add-item-name"
                      required
                      placeholder="e.g. Truffle Cheese Fries"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-sm"
                    />
                  </div>

                  {/* Item Price */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Item Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="add-item-price"
                      required
                      placeholder="e.g. 199"
                      value={addPrice}
                      onChange={(e) => setAddPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-sm"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="add-item-category"
                    value={addCategoryId}
                    onChange={(e) => setAddCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-sm bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.icon || '🍽️'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Description */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Item Description
                  </label>
                  <textarea
                    rows={3}
                    id="add-item-description"
                    placeholder="Crispy golden snacks with signature spices and dip..."
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-sm"
                  />
                </div>

                {/* Dietary & Availability Row */}
                <div className="flex flex-wrap items-center gap-6 py-2 border-y border-stone-100">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      id="add-item-isveg"
                      checked={addIsVeg}
                      onChange={(e) => setAddIsVeg(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>🌱 Mark as Vegetarian</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      id="add-item-available"
                      checked={addAvailable}
                      onChange={(e) => setAddAvailable(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span>Available in Kitchen</span>
                  </label>
                </div>

                {/* File-Picker Dropzone Layer for Item Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Item Image (Dropzone / File Upload)
                  </label>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsAddDragging(true);
                    }}
                    onDragLeave={() => setIsAddDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsAddDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleAddFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                      isAddDragging
                        ? 'border-amber-500 bg-amber-50/60'
                        : addImagePreview
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-stone-300 hover:border-amber-400 bg-stone-50/50'
                    }`}
                    onClick={() => document.getElementById('add-file-input')?.click()}
                  >
                    <input
                      type="file"
                      id="add-file-input"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAddFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {addImagePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={addImagePreview}
                          alt="Preview"
                          className="w-32 h-24 object-cover rounded-lg border border-stone-200 shadow-sm"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700">
                            ✓ {addImageFile?.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddImageFile(null);
                              setAddImagePreview('');
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <UploadCloud className="text-amber-500" size={32} />
                        <p className="text-sm font-semibold text-stone-700">
                          Click to browse or drag and drop image here
                        </p>
                        <p className="text-xs text-stone-400">
                          Supports PNG, JPG, WEBP, or SVG (Up to 10MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Optional Image URL Override */}
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Or enter image path / URL (e.g. /src/images/Burger/classic-veg.png)"
                      value={addImageUrl}
                      onChange={(e) => setAddImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-800 placeholder-stone-400"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="submit-add-item-btn"
                  disabled={submittingAdd}
                  className="w-full py-3 px-6 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submittingAdd ? (
                    <>
                      <RefreshCw className="animate-spin" size={17} />
                      Adding Dish to PostgreSQL...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Add Dish to Menu
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Secondary Action Box: "Add New Category" (1 Col) */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 self-start">
              <div className="border-b border-stone-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <FolderPlus className="text-amber-500" size={18} />
                  Add New Category
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">
                  Dynamically extends the options pool in the frozen 'categories' table catalog
                </p>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="new-category-name"
                    placeholder="e.g. Waffles & Crepes"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Emoji / Icon
                  </label>
                  <input
                    type="text"
                    id="new-category-icon"
                    placeholder="🧇"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  id="submit-add-category-btn"
                  disabled={submittingCat}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {submittingCat ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} /> Seeding...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Instant Add Category
                    </>
                  )}
                </button>
              </form>

              {/* Current Categories List */}
              <div className="mt-6 pt-5 border-t border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Active Categories Pool ({categories.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {categories.map((c) => (
                    <span
                      key={c.id || c._id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-xs font-medium"
                    >
                      <span>{c.icon || '🍽️'}</span>
                      <span>{c.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PANEL B: [Remove Item Form View]
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'remove' && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
            <div className="border-b border-stone-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Trash2 className="text-rose-600" size={20} />
                Remove Dish from Database
              </h2>
              <p className="text-stone-500 text-xs mt-0.5">
                Select an item from the picker to permanently purge it from 'menu_items' table
              </p>
            </div>

            <div className="space-y-6">
              {/* Drop-down item picker array component */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Select Target Dish to Remove <span className="text-rose-500">*</span>
                </label>
                <select
                  id="remove-item-picker"
                  value={removeId}
                  onChange={(e) => setRemoveId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-stone-900 text-sm bg-white font-medium shadow-sm"
                >
                  <option value="">-- Choose a dish from menu ({items.length} available) --</option>
                  {items.map((item) => (
                    <option key={item.id || item._id} value={item.id || item._id}>
                      {item.name} — ₹{item.price} ({typeof item.category === 'object' ? item.category?.name : 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Box of selected item */}
              {selectedRemoveItem && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex items-center gap-4">
                  {(selectedRemoveItem.image || selectedRemoveItem.imageUrl) ? (
                    <img
                      src={selectedRemoveItem.image || selectedRemoveItem.imageUrl}
                      alt={selectedRemoveItem.name}
                      className="w-20 h-20 object-cover rounded-lg border border-stone-200 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 text-2xl">
                      🍽️
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-900 text-base truncate">
                      {selectedRemoveItem.name}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                      {selectedRemoveItem.description || 'No description provided'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="font-extrabold text-stone-900">₹{selectedRemoveItem.price}</span>
                      <span className="text-stone-400">•</span>
                      <span className="text-stone-600 font-medium">
                        {typeof selectedRemoveItem.category === 'object' ? selectedRemoveItem.category?.name : 'Category'}
                      </span>
                      {selectedRemoveItem.isVeg && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          VEG
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button: Bold red 'Permanently Delete Dish' */}
              <div className="pt-2">
                <button
                  type="button"
                  id="permanently-delete-dish-btn"
                  disabled={!removeId || deleting}
                  onClick={handleRemoveItem}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Deleting from PostgreSQL...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Permanently Delete Dish
                    </>
                  )}
                </button>
                <p className="text-stone-400 text-xs text-center mt-2">
                  Triggers window confirm modal then executes Sequelize .destroy() without full-page reload
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PANEL C: [Update Item Form View]
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'update' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
            <div className="border-b border-stone-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Edit3 className="text-blue-600" size={20} />
                Update Item Overrides
              </h2>
              <p className="text-stone-500 text-xs mt-0.5">
                Select an item to pre-populate and safely modify its name, price, description, or image
              </p>
            </div>

            {/* Item Entry Selector Box */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Select Dish to Edit <span className="text-rose-500">*</span>
              </label>
              <select
                id="update-item-picker"
                value={updateId}
                onChange={(e) => handleSelectUpdateItem(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 text-sm bg-white font-medium shadow-sm"
              >
                <option value="">-- Choose an item to edit ({items.length} items) --</option>
                {items.map((item) => (
                  <option key={item.id || item._id} value={item.id || item._id}>
                    {item.name} — ₹{item.price} ({typeof item.category === 'object' ? item.category?.name : 'General'})
                  </option>
                ))}
              </select>
            </div>

            {selectedUpdateItem ? (
              <form onSubmit={handleUpdateItemSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="update-item-name"
                      required
                      value={updateName}
                      onChange={(e) => setUpdateName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 text-sm"
                    />
                  </div>

                  {/* Item Price */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Item Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="update-item-price"
                      required
                      value={updatePrice}
                      onChange={(e) => setUpdatePrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 text-sm"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    id="update-item-category"
                    value={updateCategoryId}
                    onChange={(e) => setUpdateCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 text-sm bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.icon || '🍽️'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Description */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Item Description
                  </label>
                  <textarea
                    rows={3}
                    id="update-item-description"
                    value={updateDescription}
                    onChange={(e) => setUpdateDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 text-sm"
                  />
                </div>

                {/* Dietary & Availability Row */}
                <div className="flex flex-wrap items-center gap-6 py-2 border-y border-stone-100">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      id="update-item-isveg"
                      checked={updateIsVeg}
                      onChange={(e) => setUpdateIsVeg(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>🌱 Mark as Vegetarian</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-stone-700">
                    <input
                      type="checkbox"
                      id="update-item-available"
                      checked={updateAvailable}
                      onChange={(e) => setUpdateAvailable(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span>Available in Kitchen</span>
                  </label>
                </div>

                {/* Image Upload Picker / Dropzone Layer */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Image Override (File Picker / URL)
                  </label>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsUpdateDragging(true);
                    }}
                    onDragLeave={() => setIsUpdateDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsUpdateDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleUpdateFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                      isUpdateDragging
                        ? 'border-blue-500 bg-blue-50/60'
                        : updateImagePreview
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-stone-300 hover:border-blue-400 bg-stone-50/50'
                    }`}
                    onClick={() => document.getElementById('update-file-input')?.click()}
                  >
                    <input
                      type="file"
                      id="update-file-input"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUpdateFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {updateImagePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={updateImagePreview}
                          alt="New preview"
                          className="w-32 h-24 object-cover rounded-lg border border-stone-200 shadow-sm"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700">
                            ✓ New File: {updateImageFile?.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUpdateImageFile(null);
                              setUpdateImagePreview('');
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ) : updateImageUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={updateImageUrl}
                          alt="Current asset"
                          className="w-32 h-24 object-cover rounded-lg border border-stone-200 shadow-sm"
                        />
                        <p className="text-xs text-stone-500">
                          Current Asset Link: <code className="bg-stone-100 px-1 py-0.5 rounded">{updateImageUrl}</code>
                        </p>
                        <p className="text-xs text-blue-600 font-semibold">
                          Click to upload replacement file or drop image
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <UploadCloud className="text-blue-500" size={32} />
                        <p className="text-sm font-semibold text-stone-700">
                          Click to select a new image file or drag here
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual URL input override */}
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Or override asset URL (e.g. /src/images/Burger/classic-veg.png)"
                      value={updateImageUrl}
                      onChange={(e) => setUpdateImageUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-800 placeholder-stone-400"
                    />
                  </div>
                </div>

                {/* Save Changes Button */}
                <button
                  type="submit"
                  id="save-dish-changes-btn"
                  disabled={savingUpdate}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {savingUpdate ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Updating PostgreSQL database...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Save Dish Changes
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-12 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <Utensils size={36} className="mx-auto text-stone-300 mb-2" />
                <p className="text-sm font-medium">Please select an item from the picker above to begin editing</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
