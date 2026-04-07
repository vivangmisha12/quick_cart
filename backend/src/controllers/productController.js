const Product = require('../models/Product');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs/promises');

const uploadToCloudinary = async (file, folder = 'quick-cart/products') => {
  if (!file) return { url: '', publicId: '' };
  try {
    const res = await cloudinary.uploader.upload(file.path, { folder });
    return { url: res.secure_url, publicId: res.public_id };
  } catch (err) {
    console.error('Cloudinary upload failed:', err.message);
    return { url: '', publicId: '' };
  } finally {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
};
// Get all products (with category filter)
exports.getAllProducts = async (req, res) => {
  try {
    const { categoryId, subcategoryId, search, trending } = req.query;
    let query = {};

    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (trending === 'true') query.isTrending = true;

    const products = await Product.find(query)
      .populate('categoryId', 'name icon');
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name icon');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const products = await Product.find({ categoryId })
      .populate('categoryId', 'name icon');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get trending products
exports.getTrendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ isTrending: true })
      .populate('categoryId', 'name icon')
      .limit(10);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create product (admin only)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, originalPrice, categoryId, subcategoryId, image, stock, deliveryTime, unit, discount } = req.body;
    const { url, publicId } = await uploadToCloudinary(req.file);
    const product = new Product({
      name,
      description,
      price,
      originalPrice,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      image: url || image,
      imagePublicId: publicId || undefined,
      stock,
      deliveryTime: deliveryTime || 17,
      unit,
      discount,
    });
    await product.save();
    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update product (admin only)
exports.updateProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const payload = { ...req.body };
    if (payload.subcategoryId === '') {
      payload.subcategoryId = undefined;
    }
    const { url, publicId } = await uploadToCloudinary(req.file);

    if (url) {
      await deleteFromCloudinary(existing.imagePublicId);
      payload.image = url;
      payload.imagePublicId = publicId;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json({ message: 'Product updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete product (admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await Product.findByIdAndDelete(req.params.id);
    await deleteFromCloudinary(product.imagePublicId);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};