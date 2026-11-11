const express = require('express');
const {
  getAllBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { catalogReadLimiter, adminWriteLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/active', catalogReadLimiter, getActiveBanners);
router.get('/', catalogReadLimiter, getAllBanners);

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  adminWriteLimiter,
  upload.any(),
  createBanner
);
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  adminWriteLimiter,
  upload.any(),
  updateBanner
);
router.delete('/:id', authMiddleware, adminMiddleware, adminWriteLimiter, deleteBanner);

module.exports = router;
