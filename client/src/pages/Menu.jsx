import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown, X, Zap } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import MenuCard from '../components/MenuCard';
import ItemModal from '../components/ItemModal';

/* ── Fallback Category List ──────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { _id: 'c-quick-bites', name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' },
  { _id: 'c-loaded-fries', name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' },
  { _id: 'c-crispy-chicken', name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' },
  { _id: 'c-burger', name: 'Burger', slug: 'burger', icon: '🍔' },
  { _id: 'c-wraps', name: 'Wraps', slug: 'wraps', icon: '🌯' },
  { _id: 'c-pasta', name: 'Pasta', slug: 'pasta', icon: '🍝' },
  { _id: 'c-korean-ramen', name: 'Korean Ramen', slug: 'korean-ramen', icon: '🍜' },
  { _id: 'c-mojitos', name: 'Mojitos', slug: 'mojitos', icon: '🍹' },
  { _id: 'c-milkshakes', name: 'Milkshakes', slug: 'milkshakes', icon: '🥤' },
];

/* ── Fallback Menu Items Dataset ──────────────────────────── */
const DEFAULT_ITEMS = [
  { _id: 'item-qb1', name: 'French Fries', price: 99, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Crispy golden fries seasoned with classic salt', isVeg: true, isBestseller: true, preparationTime: 8, tags: ['crispy', 'snack', 'veg'], imageUrl: '/quick-bites/French fries.jpeg' },
  { _id: 'item-qb2', name: 'Peri Peri Fries', price: 120, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Fries tossed in fiery peri peri spice blend', isVeg: true, isBestseller: true, preparationTime: 8, tags: ['spicy', 'peri-peri', 'veg'], imageUrl: '/quick-bites/Peri peri fries.jpeg' },
  { _id: 'item-qb3', name: 'Veg Nuggets', price: 149, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Crunchy veggie nuggets served with dipping sauce', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['veg', 'nuggets', 'crunchy'], imageUrl: '/quick-bites/Veg Nuggets.jpeg' },
  { _id: 'item-qb4', name: 'Cheese Triangles', price: 160, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Crispy triangle pockets loaded with melted cheese', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['cheese', 'snack', 'veg'], imageUrl: '/quick-bites/Cheese Triangles.jpeg' },
  { _id: 'item-qb5', name: 'Ring Onion', price: 149, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Classic battered & fried onion rings, golden and crispy', isVeg: true, isBestseller: false, preparationTime: 8, tags: ['onion', 'rings', 'veg'], imageUrl: '/quick-bites/Ring Onion.jpeg' },
  { _id: 'item-qb6', name: 'Chicken Nuggets', price: 159, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Juicy chicken bites with a crispy seasoned coating', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['chicken', 'nuggets', 'crispy'], imageUrl: '/quick-bites/Chicken nuggets.jpeg' },
  { _id: 'item-qb7', name: 'Popcorn', price: 169, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Light and fluffy seasoned popcorn, perfect for snacking', isVeg: true, isBestseller: false, preparationTime: 5, tags: ['snack', 'light', 'veg'], imageUrl: '/quick-bites/Popcorn.jpeg' },
  { _id: 'item-lf1', name: 'Loaded corn cheese Fries', price: 199, category: { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' }, description: 'Golden fries generously smothered in melted cheese and sweet golden corn', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['loaded', 'cheese', 'corn'], imageUrl: '/loaded-fries/Corn cheese Fries.jpeg' },
  { _id: 'item-lf2', name: 'Chicken loaded fries', price: 199, category: { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' }, description: 'Crispy fries topped with seasoned shredded chicken, melted cheese and special sauce', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['loaded', 'chicken', 'crispy'], imageUrl: '/loaded-fries/Chicken loaded fries.jpeg' },
  { _id: 'item-lf3', name: 'Peri peri chicken Loaded fries', price: 229, category: { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' }, description: 'Fiery peri peri spiced fries loaded with spicy chicken chunks and rich cheese dressing', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['spicy', 'peri-peri', 'chicken'], imageUrl: '/loaded-fries/Peri peri chicken Loaded fries.jpeg' },
  { _id: 'item-cc1', name: 'Crispy chicken strips 4pcs', price: 199, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Tender chicken inner fillets in an ultra-crispy golden crust', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['crispy', 'strips', 'chicken'], imageUrl: '/crispy-chicken/Crispy chicken strips.jpeg' },
  { _id: 'item-cc2', name: 'Peri peri chicken strips 4pcs', price: 219, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Crispy chicken tenders coated in fiery peri peri seasoning', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['spicy', 'peri-peri', 'strips'], imageUrl: '/crispy-chicken/Peri peri chicken strips.jpeg' },
  { _id: 'item-cc3', name: 'Crispy chicken lollipop 4pcs', price: 199, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Crispy fried chicken drumettes served with tangy dip', isVeg: false, isBestseller: true, preparationTime: 15, tags: ['crispy', 'lollipop', 'chicken'], imageUrl: '/crispy-chicken/Crispy chicken lollipop.jpeg' },
  { _id: 'item-cc4', name: 'Peri peri chicken lollipop 4pcs', price: 219, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Juicy chicken lollipops dusted with hot peri peri spices', isVeg: false, isBestseller: false, preparationTime: 15, tags: ['spicy', 'peri-peri', 'lollipop'], imageUrl: '/crispy-chicken/Peri peri chicken lollipop.jpeg' },
  { _id: 'item-cc5', name: 'Crispy chicken wings 4pcs', price: 199, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Golden fried crunchy chicken wings seasoned to perfection', isVeg: false, isBestseller: true, preparationTime: 15, tags: ['crispy', 'wings', 'chicken'], imageUrl: '/crispy-chicken/Crispy chicken wings.jpeg' },
  { _id: 'item-cc6', name: 'Peri peri chicken wings 4pcs', price: 219, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Spicy peri peri glazed chicken wings packed with bold flavour', isVeg: false, isBestseller: false, preparationTime: 15, tags: ['spicy', 'peri-peri', 'wings'], imageUrl: '/crispy-chicken/Peri peri chicken wings.jpeg' },
  { _id: 'item-cc7', name: 'Dynamite chicken', price: 229, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Crispy bite-sized chicken tossed in creamy spicy dynamite sauce', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['dynamite', 'spicy', 'chicken'], imageUrl: '/crispy-chicken/Dynamite chicken.jpeg' },
  { _id: 'item-bg1', name: 'Classic veg burger', price: 149, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Crispy vegetable patty with fresh lettuce, tomatoes and house special burger mayo', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['veg', 'classic', 'burger'], imageUrl: '/burger/Classic veg burger.jpeg' },
  { _id: 'item-bg2', name: 'Panner burger', price: 199, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Spiced golden paneer patty layered with fresh veggies and tangy mint chutney mayo', isVeg: true, isBestseller: false, preparationTime: 12, tags: ['veg', 'paneer', 'desi'], imageUrl: '/burger/Panner burger.jpeg' },
  { _id: 'item-bg3', name: 'Crispy Chicken Burger', price: 199, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Juicy fried chicken breast in crunchy batter topped with crisp lettuce and creamy sauce', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['crispy', 'chicken', 'burger'], imageUrl: '/burger/Crispy Chicken Burger.jpeg' },
  { _id: 'item-bg4', name: 'Peri peri Crispy Chicken Burger', price: 219, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Crunchy chicken patty coated in spicy peri peri spice blend with zesty sauce', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['spicy', 'peri-peri', 'chicken'], imageUrl: '/burger/Peri peri Crispy Chicken Burger.jpeg' },
  { _id: 'item-bg5', name: 'Crispy Chicken Cheese Burger', price: 219, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Golden crispy chicken burger stacked with melted cheddar cheese slice', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['cheese', 'crispy', 'chicken'], imageUrl: '/burger/Crispy Chicken Cheese Burger-.jpeg' },
  { _id: 'item-bg6', name: 'Dynamite chicken Burger', price: 219, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Crispy chicken patty generously glazed with spicy creamy dynamite sauce', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['dynamite', 'spicy', 'chicken'], imageUrl: '/burger/Dynamite chicken Burger.jpeg' },
  { _id: 'item-bg7', name: 'Grilled Chicken Burger', price: 199, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Flame-grilled marinated chicken breast with fresh greens and herb garlic dressing', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['grilled', 'healthy', 'chicken'], imageUrl: '/burger/Grilled Chicken Burger.jpeg' },
  { _id: 'item-p1', name: 'Penne Creamy Alfredo', price: 239, category: { name: 'Pasta', slug: 'pasta', icon: '🍝' }, description: 'Rich white sauce pasta with garlic and parmesan', isVeg: true, isBestseller: true, preparationTime: 15, tags: ['pasta', 'creamy'], imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60' },
  { _id: 'item-r1', name: 'Spicy Shin Korean Ramen', price: 229, category: { name: 'Korean Ramen', slug: 'korean-ramen', icon: '🍜' }, description: 'Authentic fiery broth with noodles, egg & mushrooms', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['spicy', 'ramen'], imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60' },
  { _id: 'item-m1', name: 'Classic Virgin Mojito', price: 129, category: { name: 'Mojitos', slug: 'mojitos', icon: '🍹' }, description: 'Fresh mint, lime wedges & sparkling soda', isVeg: true, isBestseller: true, preparationTime: 5, tags: ['mint', 'soda'], imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60' },
  { _id: 'item-ms1', name: 'Belgian Chocolate Milkshake', price: 179, category: { name: 'Milkshakes', slug: 'milkshakes', icon: '🥤' }, description: 'Thick creamy milkshake made with rich Belgian dark chocolate', isVeg: true, isBestseller: true, preparationTime: 6, tags: ['chocolate'], imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60' },
];

const filterAndSortLocal = (category, search, veg, sortBy) => {
  let list = [...DEFAULT_ITEMS];
  if (category && category !== 'all') {
    list = list.filter((i) => i.category.slug === category);
  }
  if (veg) {
    list = list.filter((i) => i.isVeg);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.name.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'prep_time') return (a.preparationTime || 0) - (b.preparationTime || 0);
    if (sortBy === 'popularity') return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
    return a.name.localeCompare(b.name);
  });

  return list;
};

export default function Menu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [dsaMeta, setDsaMeta] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Extracted URL state data
  const selectedCategory = searchParams.get('category') || 'all';
  const activePage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || searchParams.get('sortBy') || 'popularity';
  const onlyVeg = searchParams.get('veg') === 'true';

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    document.title = 'Menu — Dood Cafe';
    axiosInstance
      .get('/menu/categories')
      .then((res) => {
        const catList = res.data?.data;
        if (Array.isArray(catList) && catList.length > 0) {
          setCategories(catList);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      })
      .catch(() => setCategories(DEFAULT_CATEGORIES));
  }, []);

  // Fetch live API data using Axios based on URL params: GET /api/menu?category=${selectedCategory}...
  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy) {
        params.set('sort', sortBy);
        params.set('sortBy', sortBy);
      }
      if (onlyVeg) params.set('veg', 'true');
      params.set('page', activePage);
      params.set('limit', '12');

      const res = await axiosInstance.get(`/menu?${params.toString()}`);
      const responseData = res.data;
      const fetchedItems = responseData?.data;

      if (Array.isArray(fetchedItems) && fetchedItems.length > 0) {
        setItems(fetchedItems);
        setPagination(
          responseData.meta?.pagination ||
            responseData.pagination || { pages: 1, total: fetchedItems.length, page: 1 }
        );
        if (responseData.meta?.dsaEngine) {
          setDsaMeta(responseData.meta.dsaEngine);
        }
      } else {
        const fallbackList = filterAndSortLocal(selectedCategory, searchQuery, onlyVeg, sortBy);
        setItems(fallbackList);
        setPagination({ pages: 1, total: fallbackList.length, page: 1 });
      }
    } catch (err) {
      console.warn('Backend API connection warning, using local dataset:', err);
      const fallbackList = filterAndSortLocal(selectedCategory, searchQuery, onlyVeg, sortBy);
      setItems(fallbackList);
      setPagination({ pages: 1, total: fallbackList.length, page: 1 });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, activePage, onlyVeg]);

  useEffect(() => {
    fetchMenuItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchMenuItems]);

  const handleCategoryChange = (slug) => {
    const p = new URLSearchParams(searchParams);
    if (slug === 'all') p.delete('category');
    else p.set('category', slug);
    p.delete('page');
    setSearchParams(p);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (searchInput.trim()) p.set('search', searchInput.trim());
    else p.delete('search');
    p.delete('page');
    setSearchParams(p);
  };

  const clearSearch = () => {
    setSearchInput('');
    const p = new URLSearchParams(searchParams);
    p.delete('search');
    setSearchParams(p);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    const p = new URLSearchParams(searchParams);
    if (val) {
      p.set('sort', val);
      p.set('sortBy', val);
    } else {
      p.delete('sort');
      p.delete('sortBy');
    }
    p.delete('page');
    setSearchParams(p);
  };

  const toggleVegFilter = () => {
    const p = new URLSearchParams(searchParams);
    if (onlyVeg) p.delete('veg');
    else p.set('veg', 'true');
    p.delete('page');
    setSearchParams(p);
  };

  return (
    <main className="menu-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center gap-2 justify-center mb-1">
            <span className="dsa-badge flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Zap size={13} className="text-amber-400" /> Active DSA Engine: MenuTrie &amp; QuickSort
            </span>
          </div>
          <h1 className="page-title">Our Menu</h1>
          <p className="page-sub">Explore our wide range of premium food &amp; beverages</p>
        </div>

        {/* Search & QuickSort Controls */}
        <div className="menu-controls flex flex-wrap gap-3 items-center justify-between">
          {/* MenuTrie Search Input */}
          <form className="search-bar flex-1 min-w-[260px]" onSubmit={handleSearchSubmit} role="search">
            <Search size={18} className="search-icon" />
            <input
              id="menu-search-input"
              type="search"
              className="search-input"
              placeholder="Search by Trie prefix (e.g. fries, crispy chicken, ramen)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search menu items"
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={clearSearch} title="Clear search">
                <X size={16} />
              </button>
            )}
            <button type="submit" className="search-btn" id="menu-search-btn">
              Search
            </button>
          </form>

          {/* QuickSort Selector */}
          <div className="sort-wrapper">
            <label htmlFor="menu-sort-select">
              <ArrowUpDown size={14} /> Sort By:
            </label>
            <select
              id="menu-sort-select"
              value={sortBy}
              onChange={handleSortChange}
              className="sort-select"
              aria-label="QuickSort order selector"
            >
              <option value="popularity">Bestsellers (Popularity)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="prep_time">Prep Time: Quickest</option>
              <option value="name">Name (A - Z)</option>
            </select>
          </div>

          {/* Veg Filter */}
          <button
            id="veg-filter-btn"
            className={`filter-chip ${onlyVeg ? 'filter-chip-active' : ''}`}
            onClick={toggleVegFilter}
          >
            <SlidersHorizontal size={14} />
            Veg Only
          </button>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs" role="tablist" aria-label="Menu categories">
          <button
            role="tab"
            aria-selected={selectedCategory === 'all'}
            className={`cat-tab ${selectedCategory === 'all' ? 'cat-tab-active' : ''}`}
            onClick={() => handleCategoryChange('all')}
          >
            🍽️ All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              role="tab"
              aria-selected={selectedCategory === cat.slug}
              className={`cat-tab ${selectedCategory === cat.slug ? 'cat-tab-active' : ''}`}
              id={`tab-${cat.slug}`}
              onClick={() => handleCategoryChange(cat.slug)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Active Search & DSA Info Bar */}
        {searchQuery && (
          <div className="search-indicator flex items-center justify-between text-sm py-2 px-3 bg-stone-900/60 rounded-md border border-stone-800 my-3">
            <span>
              Trie Search results for "<strong>{searchQuery}</strong>"
            </span>
            <button className="search-clear-inline text-amber-400 hover:underline flex items-center gap-1" onClick={clearSearch}>
              <X size={14} /> Clear Search
            </button>
          </div>
        )}

        {/* Dynamic Grid Cards Displaying Photo, Name, and Price */}
        {loading ? (
          <div className="menu-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No menu items found</h3>
            <p>Try a different search term or category filter</p>
          </div>
        ) : (
          <div className="menu-grid">
            {items.map((item) => (
              <MenuCard key={item._id} item={item} onItemClick={(it) => setSelectedItem(it)} />
            ))}
          </div>
        )}

        {/* Item Quick View Modal */}
        {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${activePage === p ? 'page-btn-active' : ''}`}
                onClick={() => {
                  const sp = new URLSearchParams(searchParams);
                  sp.set('page', p);
                  setSearchParams(sp);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
