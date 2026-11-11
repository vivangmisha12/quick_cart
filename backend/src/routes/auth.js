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
const {
  authLoginLimiter,
  authIpBurstLimiter,
  authRegisterLimiter,
  profileMutationLimiter,
  pollingReadLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authRegisterLimiter, register);
router.post('/delivery/register', authRegisterLimiter, registerDeliveryPartner);
router.post('/login', authIpBurstLimiter, authLoginLimiter, login);
router.put('/delivery/verify', authMiddleware, profileMutationLimiter, verifyDeliveryPartner);
router.put('/delivery/status', authMiddleware, profileMutationLimiter, updateDeliveryStatus);
router.get('/profile', authMiddleware, pollingReadLimiter, getProfile);
router.put('/profile', authMiddleware, profileMutationLimiter, updateProfile);

module.exports = router;
