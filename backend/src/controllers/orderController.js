const Order = require('../models/Order');
const Cart = require('../models/Cart');
const crypto = require('crypto');

// Create order (COD / Standard)
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, deliveryTip, deliveryInstructions } = req.body;

    const cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const tip = Number(deliveryTip) || 0;
    const finalTotal = cart.totalPrice + tip;

    const formattedItems = cart.items.map((item) => {
      const prod = item.productId || {};
      return {
        productId: prod._id || item.productId,
        name: prod.name || 'Grocery Item',
        price: item.price || prod.price || 0,
        quantity: item.quantity || 1,
        image: prod.image || '',
      };
    });

    const order = new Order({
      userId: req.userId,
      items: formattedItems,
      totalPrice: finalTotal,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      deliveryTip: tip,
      deliveryInstructions: deliveryInstructions || [],
      status: 'confirmed',
    });

    await order.save();

    // Clear cart after order
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create Razorpay Order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid order amount' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If real keys are present in .env, call Razorpay Orders API
    if (keyId && keySecret && !keyId.includes('YOUR_')) {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // in paise
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
        }),
      });

      if (rzpRes.ok) {
        const orderData = await rzpRes.json();
        return res.json({
          id: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          keyId: keyId,
          isDemo: false,
        });
      }
    }

    // Demo/Sandbox fallback order if keys are pending in .env
    const mockOrderId = `order_${Date.now()}`;
    return res.json({
      id: mockOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      keyId: keyId || 'rzp_test_BlinkitDemo',
      isDemo: true,
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ message: 'Failed to create payment order', error: err.message });
  }
};

// Verify Razorpay Payment & Place Order
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      shippingAddress,
      deliveryTip,
      deliveryInstructions,
      isDemo
    } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify HMAC SHA256 signature if real keys are used
    if (keySecret && !isDemo && razorpay_signature) {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Payment verification failed: invalid signature' });
      }
    }

    const cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const tip = Number(deliveryTip) || 0;
    const finalTotal = cart.totalPrice + tip;

    const formattedItems = cart.items.map((item) => {
      const prod = item.productId || {};
      return {
        productId: prod._id || item.productId,
        name: prod.name || 'Grocery Item',
        price: item.price || prod.price || 0,
        quantity: item.quantity || 1,
        image: prod.image || '',
      };
    });

    const order = new Order({
      userId: req.userId,
      items: formattedItems,
      totalPrice: finalTotal,
      shippingAddress,
      paymentMethod: 'razorpay',
      paymentId: razorpay_payment_id || `pay_${Date.now()}`,
      razorpayOrderId: razorpay_order_id,
      deliveryTip: tip,
      deliveryInstructions: deliveryInstructions || [],
      status: 'confirmed',
    });

    await order.save();

    // Clear cart after successful payment
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(201).json({ message: 'Payment verified and order placed successfully!', order });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ message: 'Payment verification failed', error: err.message });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update order status (admin / ops)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, deliveryPartner } = req.body;
    const updateData = { status, updatedAt: Date.now() };

    if (deliveryPartner) {
      updateData.deliveryPartner = deliveryPartner;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('userId', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all orders (admin with full customer info)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner: Get active orders to deliver
exports.getDeliveryActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(60);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner: Update delivery status (Picked up -> Out for delivery -> Delivered)
exports.deliveryUpdateOrderStatus = async (req, res) => {
  try {
    const { status, partnerName, partnerPhone, vehicleNumber } = req.body;
    const updateData = { status, updatedAt: Date.now() };

    if (partnerName || partnerPhone) {
      updateData.deliveryPartner = {
        name: partnerName || 'Progicart Rider',
        phone: partnerPhone || '9876543210',
        vehicleNumber: vehicleNumber || 'UP-32-BK-1001',
      };
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('userId', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: `Order status updated to ${status}`, order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
