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
    label: { type: String, default: 'Home' },
    houseNo: { type: String, default: '' },
    area: { type: String, default: '' },
    landmark: { type: String, default: '' },
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String,
  },
  deliveryCoordinates: {
    lat: Number,
    lng: Number,
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi', 'card', 'wallet', 'credit_card', 'debit_card', 'razorpay'],
    default: 'cod',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentId: {
    type: String,
    index: true,
  },
  razorpayOrderId: {
    type: String,
    index: true,
  },
  razorpaySignature: String,
  paymentMethodDetail: String,
  paidAt: Date,
  deliveryFee: {
    type: Number,
    default: 0,
  },
  handlingFee: {
    type: Number,
    default: 0,
  },
  deliveryTip: {
    type: Number,
    default: 0,
  },
  deliveryInstructions: [String],
  assignedHub: {
    id: { type: String, default: 'hub_vibhuti' },
    name: { type: String, default: 'Dark Store #04 • Vibhuti Khand' },
    address: { type: String, default: 'Vibhuti Khand, Gomti Nagar, Lucknow' },
    lat: { type: Number, default: 26.8602 },
    lng: { type: Number, default: 81.0068 },
  },
  deliveryPartner: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'Assigning Rider...' },
    phone: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    distanceKm: { type: Number, default: 0 },
  },
  assignment: {
    assignedAt: { type: Date },
    expiresAt: { type: Date },
    acceptedAt: { type: Date },
    rerouteCount: { type: Number, default: 0 },
    attemptedRiderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attemptedHubIds: [String],
    lastRerouteReason: { type: String, default: '' },
    logs: [
      {
        message: String,
        hubName: String,
        riderName: String,
        distanceKm: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
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
