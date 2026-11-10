const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number,
      quantity: Number,
      image: String,
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String,
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi', 'card', 'wallet', 'credit_card', 'debit_card', 'razorpay'],
    default: 'cod',
  },
  paymentId: String,
  razorpayOrderId: String,
  deliveryTip: {
    type: Number,
    default: 0,
  },
  deliveryInstructions: [String],
  deliveryPartner: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'Rider Assigned' },
    phone: { type: String, default: '9876543210' },
    vehicleNumber: { type: String, default: 'UP-32-BK-1001' },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'packing', 'assigned', 'picked_up', 'out_for_delivery', 'shipped', 'delivered', 'cancelled'],
    default: 'confirmed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);
