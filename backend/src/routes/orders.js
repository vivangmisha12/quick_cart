const express = require('express');
const {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
  getDeliveryActiveOrders,
  deliveryUpdateOrderStatus,
} = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create a new order (COD / Standard)
router.post('/', authMiddleware, createOrder);

// Razorpay Order Creation
router.post('/razorpay/create-order', authMiddleware, createRazorpayOrder);

// Razorpay Payment Verification & Order Placement
router.post('/razorpay/verify-payment', authMiddleware, verifyRazorpayPayment);

// Delivery Partner Orders & Status APIs
router.get('/delivery/active', getDeliveryActiveOrders);
router.put('/delivery/:id/status', deliveryUpdateOrderStatus);

// Get all orders for the authenticated user
router.get('/', authMiddleware, getUserOrders);

// Get all orders (admin with full customer info)
router.get('/admin/all', authMiddleware, getAllOrders);

// Get a single order by id (owner-only)
router.get('/:id', authMiddleware, getOrderById);

// Update order status (admin)
router.put('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;
