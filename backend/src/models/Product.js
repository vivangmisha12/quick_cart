const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number, // For discounts
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId },
  image: { type: String, required: true },
  imagePublicId: { type: String },
  images: [String], // Multiple images
  stock: { type: Number, required: true, default: 0 },
  deliveryTime: Number, // In minutes (17 for Blinkit)
  unit: { type: String, default: 'piece' }, // piece, kg, liter, etc.
  discount: { type: Number, default: 0 }, // 0-100%
  isTrending: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);