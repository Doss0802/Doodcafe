/**
 * ============================================================================
 * DATA STRUCTURES & ALGORITHMS (DSA) MODULE
 * Module: FinanceDSA
 *
 * DESIGN & PURPOSE:
 * Optimized in-memory data structures for real-time financial analytics on
 * the Admin Dashboard. Transforms raw finance documents into precomputed
 * structures that enable O(1) lookups and O(log N) range queries.
 *
 * ALGORITHMS & COMPLEXITIES IMPLEMENTED:
 * 1. Prefix-Sum Array with Date Hashing (Cumulative Analytics)
 *    - Build: O(N) single pass over sorted transactions
 *    - Range Query (any date window total): O(1) via prefix[end] - prefix[start-1]
 *    - Space: O(D) where D = number of distinct date keys
 *
 * 2. Multi-Key Hash Index (Optimized Category Filtering)
 *    - Build: O(N) single pass to partition by composite key
 *    - Lookup by (type, category): O(1) hash access
 *    - Lookup by type only: O(1) hash access
 *    - Filter with multiple criteria: O(K) where K = result set size
 *
 * 3. Inventory Threshold Tracker (O(1) Alert Detection)
 *    - Classify: O(N) single pass on inventory items
 *    - Alert Query: O(1) — reads precomputed counts and item arrays
 *    - Expiry Window Check: O(E) where E = items with expiry dates
 * ============================================================================
 */

/**
 * ─── 1. PREFIX-SUM ARRAY WITH DATE HASHING ──────────────────────────────────
 *
 * Concept: Hash each transaction's date to a day-key (YYYY-MM-DD), accumulate
 * daily totals into a running prefix-sum. Any date-range aggregate becomes a
 * constant-time subtraction: total(a, b) = prefix[b] - prefix[a - 1].
 *
 * This avoids re-scanning the entire transactions array for every dashboard
 * card (income, expenses, net profit), cutting N×3 scans to a single O(N) build.
 */
class PrefixSumDateIndex {
  /**
   * Builds prefix-sum indexes for income and expense arrays
   * Time Complexity: O(N) where N = total transactions
   * Space Complexity: O(D) where D = distinct days
   *
   * @param {Array<Object>} transactions - Finance documents with type, amount, transactionDate
   */
  constructor(transactions = []) {
    // Day-key → { income: number, expense: number }
    this.dailyTotals = new Map();
    // Sorted array of day-keys for binary search
    this.sortedDays = [];
    // Prefix sums indexed by position in sortedDays
    this.prefixIncome = [];
    this.prefixExpense = [];
    // Grand totals
    this.totalIncome = 0;
    this.totalExpense = 0;

    if (transactions.length > 0) {
      this._build(transactions);
    }
  }

  /**
   * Hashes a Date object to a YYYY-MM-DD string key
   * Time: O(1)
   */
  static dateToKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Builds the prefix-sum arrays from raw transactions
   * Time: O(N + D log D) where D << N typically
   */
  _build(transactions) {
    // Phase 1: Hash each transaction into daily buckets — O(N)
    for (const txn of transactions) {
      if (txn.status === 'cancelled') continue;

      const key = PrefixSumDateIndex.dateToKey(txn.transactionDate);
      if (!this.dailyTotals.has(key)) {
        this.dailyTotals.set(key, { income: 0, expense: 0 });
      }
      const bucket = this.dailyTotals.get(key);

      if (txn.type === 'income') {
        bucket.income += txn.amount;
        this.totalIncome += txn.amount;
      } else if (txn.type === 'expense') {
        bucket.expense += txn.amount;
        this.totalExpense += txn.amount;
      }
    }

    // Phase 2: Sort day-keys chronologically — O(D log D)
    this.sortedDays = Array.from(this.dailyTotals.keys()).sort();

    // Phase 3: Build prefix-sum arrays — O(D)
    let runningIncome = 0;
    let runningExpense = 0;

    for (let i = 0; i < this.sortedDays.length; i++) {
      const day = this.sortedDays[i];
      const bucket = this.dailyTotals.get(day);
      runningIncome += bucket.income;
      runningExpense += bucket.expense;
      this.prefixIncome.push(runningIncome);
      this.prefixExpense.push(runningExpense);
    }
  }

  /**
   * Binary search for the position of a day-key in sortedDays
   * Returns the index of the first element >= target
   * Time: O(log D)
   */
  _lowerBound(target) {
    let lo = 0;
    let hi = this.sortedDays.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sortedDays[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Binary search for the position of the last element <= target
   * Time: O(log D)
   */
  _upperBound(target) {
    let lo = 0;
    let hi = this.sortedDays.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sortedDays[mid] <= target) lo = mid + 1;
      else hi = mid;
    }
    return lo - 1;
  }

  /**
   * Queries total income and expense within a date range [startDate, endDate]
   * Time Complexity: O(log D) for binary search, then O(1) subtraction
   *
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @returns {{ income: number, expense: number, netProfit: number }}
   */
  queryRange(startDate, endDate) {
    if (this.sortedDays.length === 0) {
      return { income: 0, expense: 0, netProfit: 0 };
    }

    const startKey = PrefixSumDateIndex.dateToKey(startDate);
    const endKey = PrefixSumDateIndex.dateToKey(endDate);

    const startIdx = this._lowerBound(startKey);
    const endIdx = this._upperBound(endKey);

    if (startIdx > endIdx || startIdx >= this.sortedDays.length) {
      return { income: 0, expense: 0, netProfit: 0 };
    }

    const income =
      this.prefixIncome[endIdx] - (startIdx > 0 ? this.prefixIncome[startIdx - 1] : 0);
    const expense =
      this.prefixExpense[endIdx] - (startIdx > 0 ? this.prefixExpense[startIdx - 1] : 0);

    return {
      income: +income.toFixed(2),
      expense: +expense.toFixed(2),
      netProfit: +(income - expense).toFixed(2),
    };
  }

  /**
   * Returns daily breakdown array for charting
   * Time: O(D) where D = days in range
   */
  getDailyBreakdown(startDate, endDate) {
    const startKey = PrefixSumDateIndex.dateToKey(startDate);
    const endKey = PrefixSumDateIndex.dateToKey(endDate);
    const result = [];

    for (const day of this.sortedDays) {
      if (day < startKey) continue;
      if (day > endKey) break;
      const bucket = this.dailyTotals.get(day);
      result.push({
        date: day,
        income: +bucket.income.toFixed(2),
        expense: +bucket.expense.toFixed(2),
        netProfit: +(bucket.income - bucket.expense).toFixed(2),
      });
    }

    return result;
  }
}

/**
 * ─── 2. MULTI-KEY HASH INDEX ─────────────────────────────────────────────────
 *
 * Concept: Pre-partition transactions into a HashMap keyed by composite strings:
 *   - "income" → all income transactions
 *   - "expense" → all expense transactions
 *   - "income:order_revenue" → income filtered by category
 *   - "expense:ingredients" → expense filtered by category
 *
 * Dashboard filters select from precomputed buckets in O(1) instead of
 * scanning the full array per filter combination.
 */
class MultiKeyFilterIndex {
  /**
   * Builds composite key hash index from transactions
   * Time: O(N) single pass
   * Space: O(N) across all buckets (each txn stored in 2 buckets)
   *
   * @param {Array<Object>} transactions
   */
  constructor(transactions = []) {
    // Composite key → transaction[]
    this.index = new Map();
    // Category → aggregated total
    this.categoryTotals = new Map();

    for (const txn of transactions) {
      if (txn.status === 'cancelled') continue;

      // Index by type
      const typeKey = txn.type;
      if (!this.index.has(typeKey)) this.index.set(typeKey, []);
      this.index.get(typeKey).push(txn);

      // Index by type:category composite key
      const compositeKey = `${txn.type}:${txn.category}`;
      if (!this.index.has(compositeKey)) this.index.set(compositeKey, []);
      this.index.get(compositeKey).push(txn);

      // Accumulate category totals
      if (!this.categoryTotals.has(compositeKey)) {
        this.categoryTotals.set(compositeKey, { total: 0, count: 0, category: txn.category, type: txn.type });
      }
      const agg = this.categoryTotals.get(compositeKey);
      agg.total += txn.amount;
      agg.count += 1;
    }
  }

  /**
   * O(1) lookup by type
   * @param {'income'|'expense'} type
   * @returns {Array<Object>}
   */
  getByType(type) {
    return this.index.get(type) || [];
  }

  /**
   * O(1) lookup by type + category
   * @param {'income'|'expense'} type
   * @param {string} category
   * @returns {Array<Object>}
   */
  getByTypeAndCategory(type, category) {
    return this.index.get(`${type}:${category}`) || [];
  }

  /**
   * Returns category breakdown for a given type
   * Time: O(C) where C = distinct categories for that type
   * @param {'income'|'expense'} type
   * @returns {Array<{category: string, total: number, count: number}>}
   */
  getCategoryBreakdown(type) {
    const breakdown = [];
    for (const [key, agg] of this.categoryTotals) {
      if (agg.type === type) {
        breakdown.push({
          category: agg.category,
          total: +agg.total.toFixed(2),
          count: agg.count,
        });
      }
    }
    // Sort by total descending for dashboard display priority
    breakdown.sort((a, b) => b.total - a.total);
    return breakdown;
  }

  /**
   * Multi-criteria filter with O(K) result set construction
   * @param {Object} criteria - { type, category, minAmount, maxAmount, startDate, endDate }
   * @returns {Array<Object>} Filtered transactions
   */
  filter(criteria = {}) {
    const { type, category, minAmount, maxAmount, startDate, endDate } = criteria;

    // Start from the narrowest precomputed bucket
    let pool;
    if (type && category) {
      pool = this.getByTypeAndCategory(type, category);
    } else if (type) {
      pool = this.getByType(type);
    } else {
      // Fall back to scanning all indexed transactions
      pool = [...(this.index.get('income') || []), ...(this.index.get('expense') || [])];
    }

    // Apply remaining filters in a single pass — O(K)
    return pool.filter((txn) => {
      if (minAmount !== undefined && txn.amount < minAmount) return false;
      if (maxAmount !== undefined && txn.amount > maxAmount) return false;
      if (startDate) {
        const txnDate = new Date(txn.transactionDate);
        if (txnDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const txnDate = new Date(txn.transactionDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (txnDate > end) return false;
      }
      return true;
    });
  }
}

/**
 * ─── 3. INVENTORY THRESHOLD TRACKER ──────────────────────────────────────────
 *
 * Concept: Single O(N) classification pass over inventory items to produce
 * precomputed alert buckets. Dashboard reads these in O(1).
 */
class InventoryAlertTracker {
  /**
   * Classifies all inventory items into alert categories
   * Time: O(N) single pass
   *
   * @param {Array<Object>} items - Inventory documents
   */
  constructor(items = []) {
    this.lowStock = [];           // quantity <= reorderLevel
    this.outOfStock = [];         // quantity === 0
    this.expiringWithin7Days = []; // expiry within 7 days
    this.expired = [];            // already expired
    this.healthy = [];            // above reorder level, no expiry issues
    this.totalValue = 0;          // aggregate inventory valuation
    this.categoryMap = new Map(); // category → { count, totalValue, lowStockCount }

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const item of items) {
      if (!item.isActive) continue;

      const qty = item.quantity || 0;
      const reorder = item.reorderLevel || 0;
      const cost = item.costPerUnit || 0;
      const itemValue = +(qty * cost).toFixed(2);

      this.totalValue += itemValue;

      // Category aggregation
      const cat = item.category || 'other';
      if (!this.categoryMap.has(cat)) {
        this.categoryMap.set(cat, { count: 0, totalValue: 0, lowStockCount: 0 });
      }
      const catAgg = this.categoryMap.get(cat);
      catAgg.count += 1;
      catAgg.totalValue += itemValue;

      // Stock level classification — O(1) per item
      if (qty === 0) {
        this.outOfStock.push(item);
        catAgg.lowStockCount += 1;
      } else if (qty <= reorder) {
        this.lowStock.push(item);
        catAgg.lowStockCount += 1;
      } else {
        this.healthy.push(item);
      }

      // Expiry classification — O(1) per item
      if (item.expiryDate) {
        const expiryMs = new Date(item.expiryDate).getTime();
        if (expiryMs < now) {
          this.expired.push(item);
        } else if (expiryMs - now <= sevenDaysMs) {
          this.expiringWithin7Days.push(item);
        }
      }
    }

    this.totalValue = +this.totalValue.toFixed(2);
  }

  /**
   * Returns summary stats in O(1)
   */
  getSummary() {
    return {
      totalItems: this.lowStock.length + this.outOfStock.length + this.healthy.length,
      lowStockCount: this.lowStock.length,
      outOfStockCount: this.outOfStock.length,
      expiringCount: this.expiringWithin7Days.length,
      expiredCount: this.expired.length,
      healthyCount: this.healthy.length,
      totalInventoryValue: this.totalValue,
    };
  }

  /**
   * Returns all alert items combined (low stock + out of stock + expiring)
   * Time: O(A) where A = total alerts
   */
  getAlerts() {
    return [
      ...this.outOfStock.map((i) => ({ ...i._doc || i, alertType: 'out_of_stock', severity: 'critical' })),
      ...this.expired.map((i) => ({ ...i._doc || i, alertType: 'expired', severity: 'critical' })),
      ...this.lowStock.map((i) => ({ ...i._doc || i, alertType: 'low_stock', severity: 'warning' })),
      ...this.expiringWithin7Days.map((i) => ({ ...i._doc || i, alertType: 'expiring_soon', severity: 'warning' })),
    ];
  }

  /**
   * Returns category breakdown for inventory grid
   */
  getCategoryBreakdown() {
    const result = [];
    for (const [category, agg] of this.categoryMap) {
      result.push({
        category,
        count: agg.count,
        totalValue: +agg.totalValue.toFixed(2),
        lowStockCount: agg.lowStockCount,
      });
    }
    result.sort((a, b) => b.totalValue - a.totalValue);
    return result;
  }
}

module.exports = {
  PrefixSumDateIndex,
  MultiKeyFilterIndex,
  InventoryAlertTracker,
};
