const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
} = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create a new order for the authenticated user
router.post('/', authMiddleware, createOrder);

// Get all orders for the authenticated user
router.get('/', authMiddleware, getUserOrders);

// Get all orders (admin only) — keep behind auth for now
router.get('/admin/all', authMiddleware, getAllOrders);

// Get a single order by id (owner-only)
router.get('/:id', authMiddleware, getOrderById);

// Update order status (could be restricted further if admin middleware exists)
router.put('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;
