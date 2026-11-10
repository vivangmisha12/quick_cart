const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  cta: {
    type: String,
    default: 'Shop Now'
  },
  link: {
    type: String,
    default: '/products'
  },
  image: {
    type: String
  },
  bg: {
    type: String,
    default: '#f4fae7'
  },
  textColor: {
    type: String,
    default: '#333333'
  },
  type: {
    type: String,
    enum: ['hero', 'promo'],
    default: 'promo'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
