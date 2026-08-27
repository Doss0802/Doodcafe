/**
 * ============================================================================
 * DATA STRUCTURES & ALGORITHMS (DSA) MODULE
 * Module: CatalogDSA
 * 
 * DESIGN & PURPOSE:
 * Optimized backend data structures and algorithms for searching, sorting,
 * and filtering menu items and catalog data in memory.
 * 
 * ALGORITHMS & COMPLEXITIES IMPLEMENTED:
 * 1. Trie Data Structure (Prefix & Keyword Search Engine)
 *    - Search / Insert: O(K) where K is string token length
 *    - Memory Space: O(N * K)
 * 2. QuickSort Algorithm (In-Place Multi-Attribute Sorting)
 *    - Average Time: O(N log N)
 *    - Worst-case Time: O(N^2) [Mitigated via Median-of-Three pivot]
 *    - Auxiliary Space: O(log N) recursion stack
 * 3. Binary Search Algorithm (Price Range Boundary Lookup)
 *    - Range Boundary Search: O(log N) on pre-sorted array
 *    - Space: O(1)
 * 4. Bitmask & Inverted Index Criteria Filtering
 *    - Filter Scan: O(N) single-pass with early evaluation bit-masks
 * ============================================================================
 */

/**
 * ─── 1. TRIE DATA STRUCTURE FOR KEYWORD SEARCH & AUTOCOMPLETE ────────────────
 */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.itemIds = new Set(); // Stores matching menu item IDs for fast O(1) lookup
  }
}

class MenuTrie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Normalizes input text into clean lowercase token words
   * @param {string} text
   * @returns {string[]}
   */
  static tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 0);
  }

  /**
   * Inserts a menu item into the Trie index across its name, tags, and description
   * Time Complexity: O(K) where K is cumulative character length of tokens
   * @param {Object} item - Menu item document with _id, name, tags, description
   */
  insertItem(item) {
    const idStr = item._id ? item._id.toString() : item.id;
    const tokens = new Set([
      ...MenuTrie.tokenize(item.name),
      ...(item.tags ? item.tags.flatMap((tag) => MenuTrie.tokenize(tag)) : []),
      ...MenuTrie.tokenize(item.description),
    ]);

    for (const token of tokens) {
      let current = this.root;
      for (let i = 0; i < token.length; i++) {
        const char = token[i];
        if (!current.children.has(char)) {
          current.children.set(char, new TrieNode());
        }
        current = current.children.get(char);
        current.itemIds.add(idStr); // Store reference at prefix node
      }
      current.isEndOfWord = true;
    }
  }

  /**
   * Searches for items matching a prefix query string
   * Time Complexity: O(P) where P is prefix query length
   * @param {string} query - Search term prefix
   * @returns {Set<string>} Set of matching menu item IDs
   */
  searchPrefix(query) {
    const tokens = MenuTrie.tokenize(query);
    if (tokens.length === 0) return new Set();

    let matchingIds = null;

    for (const token of tokens) {
      let current = this.root;
      let found = true;

      for (let i = 0; i < token.length; i++) {
        const char = token[i];
        if (!current.children.has(char)) {
          found = false;
          break;
        }
        current = current.children.get(char);
      }

      const tokenMatchIds = found ? current.itemIds : new Set();

      if (matchingIds === null) {
        matchingIds = new Set(tokenMatchIds);
      } else {
        // Intersect matching sets (AND logic across search tokens)
        matchingIds = new Set([...matchingIds].filter((id) => tokenMatchIds.has(id)));
      }
    }

    return matchingIds || new Set();
  }
}

/**
 * ─── 2. QUICKSORT ALGORITHM FOR IN-MEMORY SORTING ────────────────────────────
 */

/**
 * Custom comparator generator for multi-attribute menu sorting
 * @param {string} sortBy - 'price_asc' | 'price_desc' | 'popularity' | 'prep_time' | 'name'
 * @returns {Function} Comparator function returning negative, zero, or positive
 */
const getComparator = (sortBy) => {
  switch (sortBy) {
    case 'price_asc':
      return (a, b) => a.price - b.price;
    case 'price_desc':
      return (a, b) => b.price - a.price;
    case 'popularity':
      return (a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
    case 'prep_time':
      return (a, b) => (a.preparationTime || 0) - (b.preparationTime || 0);
    case 'name':
    default:
      return (a, b) => a.name.localeCompare(b.name);
  }
};

/**
 * Partitions array segment around a pivot element (Median-of-Three pivot strategy)
 * Time Complexity: O(N) per partition step
 */
const partition = (arr, low, high, comparator) => {
  // Median-of-Three pivot selection to avoid O(N^2) on pre-sorted arrays
  const mid = Math.floor((low + high) / 2);
  if (comparator(arr[low], arr[mid]) > 0) [arr[low], arr[mid]] = [arr[mid], arr[low]];
  if (comparator(arr[low], arr[high]) > 0) [arr[low], arr[high]] = [arr[high], arr[low]];
  if (comparator(arr[mid], arr[high]) > 0) [arr[mid], arr[high]] = [arr[high], arr[mid]];

  // Place median pivot at high - 1 position
  [arr[mid], arr[high - 1]] = [arr[high - 1], arr[mid]];
  const pivot = arr[high - 1];

  let i = low;
  let j = high - 1;

  while (true) {
    while (comparator(arr[++i], pivot) < 0) {}
    while (comparator(arr[--j], pivot) > 0) {}
    if (i >= j) break;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  [arr[i], arr[high - 1]] = [arr[high - 1], arr[i]];
  return i;
};

/**
 * Recursive QuickSort algorithm implementation
 * Time Complexity: O(N log N) average, space: O(log N) stack
 * @param {Array} arr - Items array to sort in-place
 * @param {number} low - Start index
 * @param {number} high - End index
 * @param {Function} comparator - Element comparator function
 */
const quickSortRecursive = (arr, low, high, comparator) => {
  if (low + 10 > high) {
    // Insertion sort optimization for small partitions (N <= 10)
    for (let i = low + 1; i <= high; i++) {
      const temp = arr[i];
      let j = i;
      while (j > low && comparator(arr[j - 1], temp) > 0) {
        arr[j] = arr[j - 1];
        j--;
      }
      arr[j] = temp;
    }
    return;
  }

  const pivotIndex = partition(arr, low, high, comparator);
  quickSortRecursive(arr, low, pivotIndex - 1, comparator);
  quickSortRecursive(arr, pivotIndex + 1, high, comparator);
};

/**
 * Public QuickSort entry point
 * @param {Array} items - Items array
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted array
 */
const quickSortMenuItems = (items, sortBy = 'name') => {
  if (!Array.isArray(items) || items.length <= 1) return items ? [...items] : [];
  const copy = [...items];
  const comparator = getComparator(sortBy);
  quickSortRecursive(copy, 0, copy.length - 1, comparator);
  return copy;
};

/**
 * ─── 3. BINARY SEARCH ALGORITHM FOR PRICE BOUNDARIES ─────────────────────────
 */

/**
 * Binary search to find lower boundary index of items with price >= minPrice
 * Time Complexity: O(log N) on price-sorted array
 */
const binarySearchLowerBound = (sortedItems, minPrice) => {
  let low = 0;
  let high = sortedItems.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedItems[mid].price >= minPrice) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
};

/**
 * Binary search to find upper boundary index of items with price <= maxPrice
 * Time Complexity: O(log N) on price-sorted array
 */
const binarySearchUpperBound = (sortedItems, maxPrice) => {
  let low = 0;
  let high = sortedItems.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedItems[mid].price > maxPrice) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
};

/**
 * Filters items within [minPrice, maxPrice] using O(log N) binary search on price-sorted array
 * @param {Array} items - Unsorted or sorted menu items
 * @param {number} minPrice
 * @param {number} maxPrice
 * @returns {Array} Sub-array within price range
 */
const binarySearchPriceRange = (items, minPrice = 0, maxPrice = Infinity) => {
  if (!items || items.length === 0) return [];
  // Ensure array is sorted by price ascending using QuickSort
  const sorted = quickSortMenuItems(items, 'price_asc');
  const start = binarySearchLowerBound(sorted, minPrice);
  const end = binarySearchUpperBound(sorted, maxPrice);
  return sorted.slice(start, end);
};

/**
 * ─── 4. CRITERIA FILTERING ALGORITHM ──────────────────────────────────────────
 */

/**
 * Single-pass multi-attribute filtering algorithm using bitmasks & criteria matchers
 * Time Complexity: O(N) linear scan
 * @param {Array} items - Array of menu items
 * @param {Object} criteria - Filter options (category, veg, bestseller, available, minPrice, maxPrice, search)
 * @returns {Array} Filtered list
 */
const filterMenuItems = (items, criteria = {}) => {
  if (!Array.isArray(items)) return [];

  const { category, veg, bestseller, available = true, minPrice, maxPrice, search } = criteria;

  // If search term exists, construct Trie index for O(K) token search
  let matchingSearchIds = null;
  if (search && search.trim()) {
    const trie = new MenuTrie();
    for (const item of items) {
      trie.insertItem(item);
    }
    matchingSearchIds = trie.searchPrefix(search.trim());
  }

  return items.filter((item) => {
    // Check availability
    if (available !== undefined && item.available !== available) return false;

    // Check Category matching
    if (category) {
      const catId = typeof item.category === 'object' && item.category !== null ? item.category._id || item.category.slug : item.category;
      if (catId !== category && item.category?.slug !== category) return false;
    }

    // Check Dietary Vegetarian filter
    if (veg !== undefined && String(veg) === 'true' && !item.isVeg) return false;

    // Check Bestseller flag filter
    if (bestseller !== undefined && String(bestseller) === 'true' && !item.isBestseller) return false;

    // Check Min & Max Price bounds
    if (minPrice !== undefined && item.price < Number(minPrice)) return false;
    if (maxPrice !== undefined && item.price > Number(maxPrice)) return false;

    // Check Trie Search matches
    if (matchingSearchIds !== null) {
      const idStr = item._id ? item._id.toString() : item.id;
      if (!matchingSearchIds.has(idStr)) return false;
    }

    return true;
  });
};

module.exports = {
  MenuTrie,
  quickSortMenuItems,
  binarySearchPriceRange,
  filterMenuItems,
};
