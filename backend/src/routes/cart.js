const express = require('express');
const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
} = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');
const { cartReadLimiter, cartWriteLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', authMiddleware, cartReadLimiter, getCart);
router.post('/add', authMiddleware, cartWriteLimiter, addToCart);
router.delete('/remove', authMiddleware, cartWriteLimiter, removeFromCart);
router.put('/update', authMiddleware, cartWriteLimiter, updateCartItem);
router.delete('/clear', authMiddleware, cartWriteLimiter, clearCart);

module.exports = router;
