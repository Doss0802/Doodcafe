const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    tags: [{ type: String, trim: true }],
    available: {
      type: Boolean,
      default: true,
    },
    isVeg: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    preparationTime: {
      type: Number, // in minutes
      default: 10,
    },
  },
  { timestamps: true }
);

// Compound indexes for query optimization
menuItemSchema.index({ category: 1, available: 1, price: 1 });
menuItemSchema.index({ isBestseller: -1, available: 1 });
menuItemSchema.index({ available: 1, isVeg: 1 });
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' }); // full-text search index

module.exports = mongoose.model('MenuItem', menuItemSchema);
