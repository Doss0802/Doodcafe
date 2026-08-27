const mongoose = require('mongoose');

/**
 * ============================================================================
 * FINANCE SCHEMA
 * 
 * Tracks individual financial transactions (income and expenses) for the cafe.
 * Each document represents a single monetary event — order revenue, supplier
 * payments, utility bills, salary disbursements, etc.
 * 
 * Compound indexes are tuned for the Admin Dashboard's prefix-sum analytics
 * pipeline which aggregates by (type + category + date range).
 * ============================================================================
 */

const financeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type (income/expense) is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: {
        values: [
          // Income categories
          'order_revenue',
          'catering',
          'tips',
          'refund_reversal',
          'other_income',
          // Expense categories
          'ingredients',
          'utilities',
          'rent',
          'salaries',
          'equipment',
          'marketing',
          'packaging',
          'maintenance',
          'taxes',
          'other_expense',
        ],
        message: '{VALUE} is not a valid finance category',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    // Optional link to the Order that generated this income entry
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    // Who recorded the transaction
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Transaction date (can be backdated for manual entries)
    transactionDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

// ─── High-Performance Compound Indexes ────────────────────────────────────────
// Primary analytics query: type + date range → O(log N) range scan
financeSchema.index({ type: 1, transactionDate: -1 });
// Category breakdown within type → multi-key filter optimization
financeSchema.index({ type: 1, category: 1, transactionDate: -1 });
// Status-aware aggregation (exclude cancelled from totals)
financeSchema.index({ status: 1, type: 1, transactionDate: -1 });
// Full-text search on description + reference for admin search
financeSchema.index({ description: 'text', reference: 'text' });
// Chronological ledger view
financeSchema.index({ transactionDate: -1 });

module.exports = mongoose.model('Finance', financeSchema);
