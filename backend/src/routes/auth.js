const express = require('express');
const {
  register,
  registerDeliveryPartner,
  login,
  verifyDeliveryPartner,
  updateDeliveryStatus,
  getProfile,
  updateProfile,
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/delivery/register', registerDeliveryPartner);
router.post('/login', login);
router.put('/delivery/verify', authMiddleware, verifyDeliveryPartner);
router.put('/delivery/status', authMiddleware, updateDeliveryStatus);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
