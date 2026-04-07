const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  icon: String,
  image: String,
  imagePublicId: String,
  displayOrder: Number,
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: String,
  image: String,
  imagePublicId: String,
  images: [String],
  imagePublicIds: [String],
  description: String,
  displayOrder: Number,
  showOnHome: { type: Boolean, default: false },
  homeTitle: String,
  subcategories: [subcategorySchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Category', categorySchema);