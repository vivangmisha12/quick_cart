const express = require('express');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  upload.any(),
  createCategory
);
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  upload.any(),
  updateCategory
);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCategory);

module.exports = router;