const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const crypto = require('crypto');
const {
  ASSIGNMENT_TIMEOUT_MS,
  resolveOrderCoordinates,
  assignOrderAutomatically,
  rerouteOrderToNext,
  rerouteExpiredOrders,
} = require('../utils/riderAssignment');
const {
  normalizeShippingAddress,
  upsertUserDeliveryAddress,
} = require('../utils/userAddress');

const FREE_DELIVERY_THRESHOLD = 499;
const STANDARD_DELIVERY_FEE = 15;
const STANDARD_HANDLING_FEE = 2;

const calculateOrderPricing = (cartItems = [], deliveryTip = 0) => {
  const itemTotalRaw = cartItems.reduce((sum, item) => {
    const prod = item.productId || {};
    const unitPrice = Number(prod?.price ?? item.price ?? 0);
    const qty = Math.max(1, Number(item.quantity) || 1);
    return sum + unitPrice * qty;
  }, 0);

  const itemTotal = Number(itemTotalRaw.toFixed(2));
  const deliveryFee = itemTotal > 0 && itemTotal < FREE_DELIVERY_THRESHOLD ? STANDARD_DELIVERY_FEE : 0;
  const handlingFee = itemTotal > 0 ? STANDARD_HANDLING_FEE : 0;
  const tip = Math.max(0, Math.min(5000, Number(deliveryTip) || 0));
  const grandTotal = Number((itemTotal + deliveryFee + handlingFee + tip).toFixed(2));

  return {
    itemTotal,
    deliveryFee,
    handlingFee,
    tip,
    grandTotal,
    amountPaise: Math.round(grandTotal * 100),
  };
};

const formatCartItemsForOrder = (cartItems = []) => {
  return cartItems.map((item) => {
    const prod = item.productId || {};
    return {
      productId: prod._id || item.productId,
      name: prod.name || 'Grocery Item',
      price: Number(prod?.price ?? item.price ?? 0),
      quantity: Math.max(1, Number(item.quantity) || 1),
      image: prod.image || '',
    };
  });
};

const FRIENDLY_GATEWAY_UNAVAILABLE_MSG =
  'Online payments are temporarily unavailable right now. Please try again in a moment or place your order with Cash on Delivery (COD).';

const getRazorpayConfig = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

  const isPlaceholder = (val) =>
    !val || val.includes('YOUR_') || val.includes('your_') || val.toLowerCase().includes('placeholder');

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: !isPlaceholder(keyId) && !isPlaceholder(keySecret),
    isLiveMode: keyId.startsWith('rzp_live_'),
  };
};

const isTechnicalPaymentError = (msg = '') =>
  /(\.env|RAZORPAY_|credential|authentication failed|invalid key|unauthorized|not configured|api key|secret)/i.test(
    String(msg)
  );

const verifyHmacSignature = (payload, expectedSignature, secret) => {
  if (!payload || !expectedSignature || !secret) return false;
  const generated = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const genBuf = Buffer.from(generated, 'utf8');
  const sigBuf = Buffer.from(String(expectedSignature).trim(), 'utf8');
  if (genBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(genBuf, sigBuf);
};

const razorpayRequest = async (endpoint, { method = 'GET', body } = {}) => {
  const { keyId, keySecret, isConfigured } = getRazorpayConfig();
  if (!isConfigured) {
    console.error('[Razorpay] Missing or placeholder RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in server environment.');
    const err = new Error(FRIENDLY_GATEWAY_UNAVAILABLE_MSG);
    err.statusCode = 503;
    err.isUserSafe = true;
    throw err;
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    console.error('[Razorpay] Network error reaching Razorpay API:', networkErr);
    const err = new Error(
      'Unable to connect to our online payment partner right now. Please try again or use Cash on Delivery (COD).'
    );
    err.statusCode = 502;
    err.isUserSafe = true;
    throw err;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMsg = data?.error?.description || data?.message || `Razorpay API error (${response.status})`;
    console.error(`[Razorpay] Upstream error (${response.status}) on ${endpoint}:`, rawMsg);

    const isGatewayOrAuthFailure =
      response.status === 401 ||
      response.status === 403 ||
      response.status >= 500 ||
      isTechnicalPaymentError(rawMsg);

    const err = new Error(isGatewayOrAuthFailure ? FRIENDLY_GATEWAY_UNAVAILABLE_MSG : rawMsg);
    err.statusCode =
      response.status === 401 || response.status === 403
        ? 503
        : response.status >= 500
        ? 502
        : 400;
    err.isUserSafe = true;
    throw err;
  }

  return data;
};

const createAndDispatchOrder = async ({
  userId,
  shippingAddress,
  deliveryCoordinates,
  paymentMethod,
  paymentStatus,
  paymentId,
  razorpayOrderId,
  razorpaySignature,
  paymentMethodDetail,
  paidAt,
  deliveryTip,
  deliveryInstructions,
  preloadedCart = null,
}) => {
  const cart = preloadedCart || (await Cart.findOne({ userId }).populate('items.productId'));
  if (!cart || cart.items.length === 0) {
    const err = new Error('Cart is empty');
    err.statusCode = 400;
    throw err;
  }

  const pricing = calculateOrderPricing(cart.items, deliveryTip);
  const formattedItems = formatCartItemsForOrder(cart.items);
  const normalizedShipping = normalizeShippingAddress(shippingAddress, deliveryCoordinates);
  const resolvedCoords = resolveOrderCoordinates(normalizedShipping, deliveryCoordinates);

  const order = new Order({
    userId,
    items: formattedItems,
    totalPrice: pricing.grandTotal,
    deliveryFee: pricing.deliveryFee,
    handlingFee: pricing.handlingFee,
    shippingAddress: {
      label: normalizedShipping.label,
      houseNo: normalizedShipping.houseNo,
      area: normalizedShipping.area,
      landmark: normalizedShipping.landmark,
      street: normalizedShipping.street,
      city: normalizedShipping.city,
      state: normalizedShipping.state,
      zipcode: normalizedShipping.zipcode,
      country: normalizedShipping.country,
    },
    deliveryCoordinates: resolvedCoords,
    paymentMethod: paymentMethod || 'cod',
    paymentStatus: paymentStatus || (paymentMethod === 'razorpay' ? 'paid' : 'pending'),
    paymentId,
    razorpayOrderId,
    razorpaySignature,
    paymentMethodDetail,
    paidAt,
    deliveryTip: pricing.tip,
    deliveryInstructions: deliveryInstructions || [],
    status: 'confirmed',
  });

  await order.save();

  // Save full delivery address (flat/houseNo, area, landmark, pincode, coords) onto User record
  const savedAddresses = await upsertUserDeliveryAddress(userId, normalizedShipping, resolvedCoords);

  // Clear cart after order
  cart.items = [];
  cart.totalPrice = 0;
  await cart.save();

  // Automatically assign nearest suitable verified rider & closest Dark Store Hub (with 120s SLA window)
  await assignOrderAutomatically(order, {
    reason: 'Order placed — auto-matched nearest rider',
  });

  return { order, savedAddresses };
};

// Create order (COD / Standard)
exports.createOrder = async (req, res) => {
  try {
    const {
      shippingAddress,
      deliveryCoordinates,
      paymentMethod,
      deliveryTip,
      deliveryInstructions,
    } = req.body;

    if (paymentMethod && paymentMethod !== 'cod') {
      return res.status(400).json({
        message: 'Online payments must complete verification through Razorpay checkout.',
      });
    }

    const { order, savedAddresses } = await createAndDispatchOrder({
      userId: req.userId,
      shippingAddress,
      deliveryCoordinates,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      deliveryTip,
      deliveryInstructions,
    });

    res.status(201).json({
      message: 'Order created and dispatched to nearest rider',
      order,
      savedAddresses,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error', error: err.message });
  }
};

// Create Razorpay Order (Server-computed Cart Pricing, Zero Client Amount Trust)
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { deliveryTip = 0, shippingAddress } = req.body || {};

    const cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty. Add items before paying.' });
    }

    const pricing = calculateOrderPricing(cart.items, deliveryTip);
    if (pricing.amountPaise < 100) {
      return res.status(400).json({ message: 'Minimum payable order amount is ₹1.00' });
    }

    const { keyId, isLiveMode } = getRazorpayConfig();

    const orderData = await razorpayRequest('/orders', {
      method: 'POST',
      body: {
        amount: pricing.amountPaise,
        currency: 'INR',
        receipt: `rcpt_${String(req.userId).slice(-8)}_${Date.now()}`,
        payment_capture: 1,
        notes: {
          userId: String(req.userId),
          city: shippingAddress?.city || '',
          zipcode: shippingAddress?.zipcode || '',
        },
      },
    });

    return res.json({
      id: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId,
      pricing,
      mode: isLiveMode ? 'live' : 'test',
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    const safeMessage = err.isUserSafe ? err.message : FRIENDLY_GATEWAY_UNAVAILABLE_MSG;
    res.status(err.statusCode || 500).json({
      message: safeMessage,
    });
  }
};

// Verify Razorpay Payment & Place Order (Strict HMAC SHA-256 + Razorpay Capture Verification)
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      shippingAddress,
      deliveryCoordinates,
      deliveryTip,
      deliveryInstructions,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: 'Payment details could not be verified. Please retry or contact support if amount was debited.',
      });
    }

    const { keySecret, isConfigured } = getRazorpayConfig();
    if (!isConfigured) {
      console.error('[Razorpay] Missing credentials during payment verification.');
      return res.status(503).json({
        message: 'Online payment verification is temporarily unavailable. Please contact support if any amount was debited.',
      });
    }

    const isSignatureValid = verifyHmacSignature(
      `${razorpay_order_id}|${razorpay_payment_id}`,
      razorpay_signature,
      keySecret
    );

    if (!isSignatureValid) {
      return res.status(400).json({
        message: 'We could not verify your payment. Please try again or contact support if amount was debited.',
      });
    }

    // Idempotency protection: prevent duplicate orders on retries/webhook overlap
    const existingOrder = await Order.findOne({
      $or: [{ paymentId: razorpay_payment_id }, { razorpayOrderId: razorpay_order_id }],
    });

    if (existingOrder) {
      if (String(existingOrder.userId) !== String(req.userId)) {
        return res.status(409).json({ message: 'This Razorpay payment is already linked to another order.' });
      }
      return res.status(200).json({
        message: 'Payment already verified & order placed!',
        order: existingOrder,
        idempotent: true,
      });
    }

    // Load active cart to verify paid amount against server-side pricing
    const cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty or order was already processed.' });
    }

    const serverPricing = calculateOrderPricing(cart.items, deliveryTip);

    // Fetch live payment status from Razorpay API to guarantee capture & order binding
    let paymentRecord = await razorpayRequest(`/payments/${encodeURIComponent(razorpay_payment_id)}`);

    if (paymentRecord.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: 'Payment verification failed: order ID mismatch with Razorpay.' });
    }

    if ((paymentRecord.currency || 'INR').toUpperCase() !== 'INR') {
      return res.status(400).json({ message: 'Invalid payment currency received from Razorpay.' });
    }

    if (Number(paymentRecord.amount) !== serverPricing.amountPaise) {
      return res.status(400).json({
        message: 'Paid amount does not match your current cart total. Please contact support for refund if debited.',
      });
    }

    // Capture automatically if payment remained in authorized state
    if (paymentRecord.status === 'authorized') {
      paymentRecord = await razorpayRequest(
        `/payments/${encodeURIComponent(razorpay_payment_id)}/capture`,
        {
          method: 'POST',
          body: { amount: paymentRecord.amount, currency: 'INR' },
        }
      );
    }

    if (paymentRecord.status !== 'captured') {
      return res.status(400).json({
        message: `Payment not captured yet (status: ${paymentRecord.status || 'unknown'}).`,
      });
    }

    const { order, savedAddresses } = await createAndDispatchOrder({
      userId: req.userId,
      shippingAddress,
      deliveryCoordinates,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      paymentMethodDetail: paymentRecord.method || 'online',
      paidAt: new Date(),
      deliveryTip,
      deliveryInstructions,
      preloadedCart: cart,
    });

    res.status(201).json({
      message: 'Payment verified, order placed and auto-assigned!',
      order,
      savedAddresses,
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    const safeMessage = err.isUserSafe
      ? err.message
      : 'Unable to verify your payment right now. Please contact support if any amount was debited.';
    res.status(err.statusCode || 500).json({
      message: safeMessage,
    });
  }
};

// Razorpay Server-to-Server Webhook Handler
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const { webhookSecret } = getRazorpayConfig();

    if (!webhookSecret || webhookSecret.includes('YOUR_') || webhookSecret.includes('your_')) {
      return res.status(503).json({ message: 'Payment webhook verification is not configured.' });
    }

    const rawPayload = req.rawBody;
    if (!rawPayload || !verifyHmacSignature(rawPayload, signature, webhookSecret)) {
      return res.status(400).json({ message: 'Invalid Razorpay webhook signature' });
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;

    if (paymentEntity && (paymentEntity.order_id || paymentEntity.id)) {
      const orderQuery = {
        $or: [
          ...(paymentEntity.id ? [{ paymentId: paymentEntity.id }] : []),
          ...(paymentEntity.order_id ? [{ razorpayOrderId: paymentEntity.order_id }] : []),
        ],
      };
      const existingOrder = await Order.findOne(orderQuery);

      if (existingOrder) {
        if (event === 'payment.captured') {
          existingOrder.paymentStatus = 'paid';
          existingOrder.paymentId = paymentEntity.id || existingOrder.paymentId;
          existingOrder.paymentMethodDetail = paymentEntity.method || existingOrder.paymentMethodDetail;
          existingOrder.paidAt = existingOrder.paidAt || new Date();
          existingOrder.updatedAt = new Date();
          await existingOrder.save();
        } else if (event === 'payment.failed' && existingOrder.paymentStatus !== 'paid') {
          existingOrder.paymentStatus = 'failed';
          existingOrder.updatedAt = new Date();
          await existingOrder.save();
        } else if (event === 'refund.created' || event === 'refund.processed') {
          existingOrder.paymentStatus = 'refunded';
          existingOrder.updatedAt = new Date();
          await existingOrder.save();
        }
      }
    }

    return res.json({ received: true, event });
  } catch (err) {
    console.error('Razorpay webhook processing error:', err);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

exports._razorpayHelpers = {
  calculateOrderPricing,
  getRazorpayConfig,
  verifyHmacSignature,
};

// Mark COD orders as paid once delivered (and lazily backfill legacy delivered COD orders on read)
function syncDeliveredCodPayment(order, settledAt = new Date()) {
  if (!order) return false;
  const method = String(order.paymentMethod || 'cod').toLowerCase();
  const payStatus = String(order.paymentStatus || 'pending').toLowerCase();
  if (
    order.status !== 'delivered' ||
    method !== 'cod' ||
    ['paid', 'refunded'].includes(payStatus)
  ) {
    return false;
  }

  order.paymentStatus = 'paid';
  order.paidAt = order.paidAt || settledAt;
  if (!order.paymentMethodDetail) {
    order.paymentMethodDetail = 'cash_on_delivery';
  }
  return true;
}

async function normalizeAndPersistDeliveredCod(ordersOrOrder) {
  const list = Array.isArray(ordersOrOrder) ? ordersOrOrder : [ordersOrOrder];
  const persistOps = [];

  for (const doc of list) {
    if (!doc) continue;
    const settledAt = doc.updatedAt || doc.createdAt || new Date();
    if (syncDeliveredCodPayment(doc, settledAt)) {
      persistOps.push(
        Order.updateOne(
          {
            _id: doc._id,
            status: 'delivered',
            paymentStatus: { $nin: ['paid', 'refunded'] },
          },
          {
            $set: {
              paymentStatus: 'paid',
              paidAt: doc.paidAt,
              paymentMethodDetail: doc.paymentMethodDetail,
            },
          }
        )
      );
    }
  }

  if (persistOps.length > 0) {
    await Promise.all(persistOps);
  }
  return ordersOrOrder;
}

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    await rerouteExpiredOrders();
    const orders = await Order.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    await normalizeAndPersistDeliveredCod(orders);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    await rerouteExpiredOrders();
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await normalizeAndPersistDeliveredCod(order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update order status (admin / ops)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, deliveryPartner } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const now = new Date();
    order.status = status;
    order.updatedAt = now;

    if (deliveryPartner) {
      order.deliveryPartner = deliveryPartner;
    }

    if (status === 'packing') {
      if (!order.assignment) {
        order.assignment = { rerouteCount: 0, attemptedRiderIds: [], attemptedHubIds: [], logs: [] };
      }
      order.assignment.acceptedAt = order.assignment.acceptedAt || now;
      order.assignment.expiresAt = null;
    }

    syncDeliveredCodPayment(order, now);

    await order.save();
    const populated = await Order.findById(order._id).populate('userId', 'name email phone');

    res.json({ message: 'Order status updated', order: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin: Manually assign a specific rider or trigger 120s re-route to next hub/rider
exports.adminRerouteOrder = async (req, res) => {
  try {
    const { riderId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot re-route a ${order.status} order` });
    }

    let updatedOrder;
    if (riderId) {
      const rider = await User.findById(riderId).select('name phone vehicleNumber verificationStatus');
      if (!rider) {
        return res.status(404).json({ message: 'Selected rider not found' });
      }
      if (rider.verificationStatus !== 'verified') {
        return res.status(400).json({ message: 'Selected rider has not completed KYC verification yet' });
      }

      const now = new Date();
      order.deliveryPartner = {
        id: rider._id,
        name: rider.name,
        phone: rider.phone,
        vehicleNumber: rider.vehicleNumber || 'UP-32-BK-1001',
        distanceKm: order.deliveryPartner?.distanceKm || 1.2,
      };
      order.status = 'assigned';
      if (!order.assignment) {
        order.assignment = { rerouteCount: 0, attemptedRiderIds: [], attemptedHubIds: [], logs: [] };
      }
      order.assignment.assignedAt = now;
      order.assignment.expiresAt = new Date(now.getTime() + ASSIGNMENT_TIMEOUT_MS);
      order.assignment.acceptedAt = null;
      order.assignment.lastRerouteReason = `Manually dispatched by Admin to ${rider.name}`;
      order.assignment.logs.push({
        message: `Admin assigned order to ${rider.name}`,
        hubName: order.assignedHub?.name || 'Dark Store #04',
        riderName: rider.name,
        distanceKm: order.deliveryPartner.distanceKm,
        timestamp: now,
      });
      await order.save();
      updatedOrder = order;
    } else {
      updatedOrder = await rerouteOrderToNext(
        order,
        'Manual Admin trigger — re-routed to next hub & nearest rider'
      );
    }

    const populated = await Order.findById(updatedOrder._id).populate('userId', 'name email phone');
    res.json({ message: 'Order dispatched successfully', order: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all orders (admin with full customer info)
exports.getAllOrders = async (req, res) => {
  try {
    await rerouteExpiredOrders();
    const orders = await Order.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    await normalizeAndPersistDeliveredCod(orders);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner: Get active orders assigned to this rider (and unassigned pool)
exports.getDeliveryActiveOrders = async (req, res) => {
  try {
    await rerouteExpiredOrders();

    const requester = req.userId
      ? await User.findById(req.userId).select('isAdmin isDeliveryPartner role verificationStatus').lean()
      : null;

    if (requester?.isAdmin) {
      const allOrders = await Order.find()
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(60);
      await normalizeAndPersistDeliveredCod(allOrders);
      return res.json(allOrders);
    }

    if (!requester) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (requester.verificationStatus !== 'verified') {
      return res.json([]);
    }

    const orders = await Order.find({
      $or: [
        { 'deliveryPartner.id': requester._id },
        {
          'deliveryPartner.id': { $exists: false },
          status: { $in: ['pending', 'confirmed', 'assigned'] },
        },
        {
          'deliveryPartner.id': null,
          status: { $in: ['pending', 'confirmed', 'assigned'] },
        },
      ],
    })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(60);

    await normalizeAndPersistDeliveredCod(orders);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner: Decline assigned request before 120s expiry -> immediate re-route
exports.deliveryDeclineOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['pending', 'confirmed', 'assigned'].includes(order.status) || order.assignment?.acceptedAt) {
      return res.status(400).json({ message: 'Order has already moved past acceptance window' });
    }

    const updated = await rerouteOrderToNext(
      order,
      'Declined by rider — immediately re-routed to next nearest rider & hub'
    );

    res.json({ message: 'Order declined and re-routed to next rider', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner: Accept or advance delivery status
exports.deliveryUpdateOrderStatus = async (req, res) => {
  try {
    const { status, partnerName, partnerPhone, vehicleNumber } = req.body;
    const rider = req.userId
      ? await User.findById(req.userId).select('name phone vehicleNumber isAdmin verificationStatus')
      : null;

    if (!rider) {
      return res.status(401).json({ message: 'Rider authentication required' });
    }

    if (!rider.isAdmin && rider.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'Complete your KYC verification first' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const existingOwnerId = order.deliveryPartner?.id?.toString();
    const requesterId = rider._id.toString();

    if (
      status === 'packing' &&
      order.assignment?.acceptedAt &&
      existingOwnerId &&
      existingOwnerId !== requesterId &&
      !rider.isAdmin
    ) {
      return res.status(409).json({ message: 'Order was already accepted by another rider' });
    }

    if (
      existingOwnerId &&
      existingOwnerId !== requesterId &&
      !rider.isAdmin &&
      ['picked_up', 'out_for_delivery', 'delivered'].includes(status)
    ) {
      return res.status(403).json({ message: 'This order is assigned to a different rider' });
    }

    const now = new Date();
    order.status = status;
    order.updatedAt = now;
    const codCollected = syncDeliveredCodPayment(order, now);
    order.deliveryPartner = {
      id: existingOwnerId === requesterId || !existingOwnerId || !rider.isAdmin ? rider._id : order.deliveryPartner.id,
      name: partnerName || rider.name || 'Progicart Rider',
      phone: partnerPhone || rider.phone || '9876543210',
      vehicleNumber: vehicleNumber || rider.vehicleNumber || 'UP-32-BK-1001',
      distanceKm: order.deliveryPartner?.distanceKm || 0,
    };

    if (!order.assignment) {
      order.assignment = { rerouteCount: 0, attemptedRiderIds: [], attemptedHubIds: [], logs: [] };
    }

    if (status === 'packing') {
      order.assignment.acceptedAt = order.assignment.acceptedAt || now;
      order.assignment.expiresAt = null;
      order.assignment.logs.push({
        message: `Accepted within SLA by ${order.deliveryPartner.name}`,
        hubName: order.assignedHub?.name || 'Dark Store',
        riderName: order.deliveryPartner.name,
        distanceKm: order.deliveryPartner.distanceKm || 0,
        timestamp: now,
      });
    } else {
      const logMessage =
        status === 'delivered' && codCollected
          ? `Delivered & COD cash collected by ${order.deliveryPartner.name}`
          : `Status updated to ${status} by ${order.deliveryPartner.name}`;
      order.assignment.logs.push({
        message: logMessage,
        hubName: order.assignedHub?.name || 'Dark Store',
        riderName: order.deliveryPartner.name,
        distanceKm: order.deliveryPartner.distanceKm || 0,
        timestamp: now,
      });
    }

    await order.save();
    const populated = await Order.findById(order._id).populate('userId', 'name email phone');

    res.json({ message: `Order status updated to ${status}`, order: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
