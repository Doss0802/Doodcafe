const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(arr) => arr.length > 0, 'Order must contain at least one item'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    orderType: {
      type: String,
      enum: ['takeaway'],
      default: 'takeaway',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'delivered',
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi'],
      default: 'cash',
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [200, 'Instructions cannot exceed 200 characters'],
    },
    estimatedTime: {
      type: Number, // in minutes
      default: 20,
    },
    orderNumber: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Auto-set takeaway orders to 'delivered' status and assign sequential orderNumber
orderSchema.pre('save', async function (next) {
  if (this.orderType === 'takeaway' && (!this.status || this.status === 'pending')) {
    this.status = 'delivered';
  }
  if (!this.orderNumber) {
    try {
      const userOrderCount = await mongoose.model('Order').countDocuments({ user: this.user });
      this.orderNumber = userOrderCount + 1;
    } catch (e) {
      // fallback
    }
  }
  if (typeof next === 'function') next();
});

// High-performance compound indexes for user history and admin dashboard queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderType: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
