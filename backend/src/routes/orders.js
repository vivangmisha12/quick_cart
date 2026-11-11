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
const {
  orderCheckoutLimiter,
  webhookLimiter,
  pollingReadLimiter,
  deliveryActionLimiter,
  adminWriteLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

// Create a new order (COD / Standard)
router.post('/', authMiddleware, orderCheckoutLimiter, createOrder);

// Razorpay Order Creation (Production Server-Computed Amount)
router.post('/razorpay/create-order', authMiddleware, orderCheckoutLimiter, createRazorpayOrder);

// Razorpay Payment Verification & Order Placement (Strict HMAC + API Capture Check)
router.post('/razorpay/verify-payment', authMiddleware, orderCheckoutLimiter, verifyRazorpayPayment);

// Razorpay Server-to-Server Webhook (Secured by X-Razorpay-Signature HMAC)
router.post('/razorpay/webhook', webhookLimiter, handleRazorpayWebhook);

// Delivery Partner Orders, Accept, Decline & 120s Re-routing APIs
router.get('/delivery/active', authMiddleware, pollingReadLimiter, getDeliveryActiveOrders);
router.put('/delivery/:id/status', authMiddleware, deliveryActionLimiter, deliveryUpdateOrderStatus);
router.put('/delivery/:id/decline', authMiddleware, deliveryActionLimiter, deliveryDeclineOrder);

// Get all orders for the authenticated user
router.get('/', authMiddleware, pollingReadLimiter, getUserOrders);

// Get all orders (admin with full customer info)
router.get('/admin/all', authMiddleware, adminMiddleware, pollingReadLimiter, getAllOrders);

// Admin manual assignment / re-route to next hub & rider
router.post('/:id/reroute', authMiddleware, adminMiddleware, adminWriteLimiter, adminRerouteOrder);

// Get a single order by id (owner-only)
router.get('/:id', authMiddleware, pollingReadLimiter, getOrderById);

// Update order status (admin)
router.put('/:id/status', authMiddleware, adminMiddleware, adminWriteLimiter, updateOrderStatus);

module.exports = router;
