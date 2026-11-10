const express = require('express');
const {
  getAllBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/active', getActiveBanners);
router.get('/', getAllBanners);

// Admin routes
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  upload.any(),
  createBanner
);
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  upload.any(),
  updateBanner
);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBanner);

module.exports = router;
