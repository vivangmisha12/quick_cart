const express = require('express');
const {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  adminRerouteOrder,
  getAllOrders,
  getDeliveryActiveOrders,
  deliveryDeclineOrder,
  deliveryUpdateOrderStatus,
} = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create a new order (COD / Standard)
router.post('/', authMiddleware, createOrder);

// Razorpay Order Creation (Production Server-Computed Amount)
router.post('/razorpay/create-order', authMiddleware, createRazorpayOrder);

// Razorpay Payment Verification & Order Placement (Strict HMAC + API Capture Check)
router.post('/razorpay/verify-payment', authMiddleware, verifyRazorpayPayment);

// Razorpay Server-to-Server Webhook (Secured by X-Razorpay-Signature HMAC)
router.post('/razorpay/webhook', handleRazorpayWebhook);

// Delivery Partner Orders, Accept, Decline & 120s Re-routing APIs
router.get('/delivery/active', authMiddleware, getDeliveryActiveOrders);
router.put('/delivery/:id/status', authMiddleware, deliveryUpdateOrderStatus);
router.put('/delivery/:id/decline', authMiddleware, deliveryDeclineOrder);

// Get all orders for the authenticated user
router.get('/', authMiddleware, getUserOrders);

// Get all orders (admin with full customer info)
router.get('/admin/all', authMiddleware, adminMiddleware, getAllOrders);

// Admin manual assignment / re-route to next hub & rider
router.post('/:id/reroute', authMiddleware, adminMiddleware, adminRerouteOrder);

// Get a single order by id (owner-only)
router.get('/:id', authMiddleware, getOrderById);

// Update order status (admin)
router.put('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;
