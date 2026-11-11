const express = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getTrendingProducts,
} = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { catalogReadLimiter, adminWriteLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', catalogReadLimiter, getAllProducts);
router.get('/trending', catalogReadLimiter, getTrendingProducts);
router.get('/category/:categoryId', catalogReadLimiter, getProductsByCategory);
router.get('/:id', catalogReadLimiter, getProductById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, adminWriteLimiter, upload.single('imageFile'), createProduct);
router.put('/:id', authMiddleware, adminMiddleware, adminWriteLimiter, upload.single('imageFile'), updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, adminWriteLimiter, deleteProduct);

module.exports = router;