const mongoose = require('mongoose');

/**
 * ============================================================================
 * INVENTORY SCHEMA
 * 
 * Tracks raw material / ingredient stock levels for the cafe kitchen.
 * Each document represents a single stock-keeping unit (SKU).
 * 
 * Key Features:
 * - Automatic low-stock alert threshold comparison (O(1) via virtuals)
 * - Batch/lot tracking with expiry dates
 * - Supplier reference for procurement
 * - Unit-aware quantity management
 * 
 * The AdminDashboard reads these with O(1) threshold-based alerts by
 * comparing `quantity <= reorderLevel` without any aggregation pipeline.
 * ============================================================================
 */

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      unique: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: [
          'dairy',
          'produce',
          'grains',
          'spices',
          'beverages',
          'meat',
          'bakery',
          'oils',
          'packaging',
          'cleaning',
          'equipment',
          'other',
        ],
        message: '{VALUE} is not a valid inventory category',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      enum: ['kg', 'g', 'L', 'mL', 'units', 'packs', 'dozen', 'bottles', 'cans'],
      default: 'units',
    },
    costPerUnit: {
      type: Number,
      required: [true, 'Cost per unit is required'],
      min: [0, 'Cost cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder threshold level is required'],
      min: [0, 'Reorder level cannot be negative'],
      default: 10,
    },
    supplier: {
      name: { type: String, trim: true, default: '' },
      contact: { type: String, trim: true, default: '' },
    },
    lastRestocked: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: 'Main Kitchen',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

// ─── Virtual: O(1) Low Stock Alert Check ──────────────────────────────────────
// No aggregation needed — dashboard reads this computed property directly.
inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.reorderLevel;
});

// ─── Virtual: Stock Monetary Value ────────────────────────────────────────────
inventorySchema.virtual('totalValue').get(function () {
  return +(this.quantity * this.costPerUnit).toFixed(2);
});

// ─── Virtual: Days Until Expiry ───────────────────────────────────────────────
inventorySchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const diffMs = new Date(this.expiryDate).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included in JSON/Object serialization
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

// ─── Compound Indexes ─────────────────────────────────────────────────────────
// Category filter + active items → admin inventory grid
inventorySchema.index({ category: 1, isActive: 1 });
// Low stock alert query: quantity ascending so low-stock items appear first
inventorySchema.index({ quantity: 1, reorderLevel: 1 });
// Full-text search for admin inventory search bar
inventorySchema.index({ name: 'text', sku: 'text', notes: 'text' });
// Expiry tracking — soon-to-expire items
inventorySchema.index({ expiryDate: 1, isActive: 1 });
// SKU lookup (unique already creates index, but compound with active)
inventorySchema.index({ sku: 1, isActive: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
