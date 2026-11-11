const express = require('express');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { catalogReadLimiter, adminWriteLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', catalogReadLimiter, getAllCategories);
router.get('/:id', catalogReadLimiter, getCategoryById);

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  adminWriteLimiter,
  upload.any(),
  createCategory
);
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  adminWriteLimiter,
  upload.any(),
  updateCategory
);
router.delete('/:id', authMiddleware, adminMiddleware, adminWriteLimiter, deleteCategory);

module.exports = router;