const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  
  // Multiple delivery addresses
  addresses: [
    {
      label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
      houseNo: { type: String, default: '' },
      area: { type: String, default: '' },
      landmark: { type: String, default: '' },
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipcode: { type: String, default: '' },
      country: { type: String, default: 'India' },
      coordinates: { lat: Number, lng: Number },
      isDefault: { type: Boolean, default: false },
      lastUsedAt: { type: Date, default: Date.now },
    }
  ],
  
  isAdmin: { type: Boolean, default: false },
  isDeliveryPartner: { type: Boolean, default: false },
  role: { type: String, enum: ['customer', 'admin', 'delivery_partner'], default: 'customer' },
  vehicleType: { type: String, enum: ['bike', 'scooter', 'ev', 'cycle', ''], default: '' },
  vehicleNumber: { type: String, default: '' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'suspended'],
    default: 'verified',
  },
  onboardingCompleted: { type: Boolean, default: false },
  createdByAdmin: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  assignedHub: { type: String, default: 'Dark Store #04 • Vibhuti Khand, Lucknow' },
  currentLocation: {
    lat: { type: Number, default: 26.8602 },
    lng: { type: Number, default: 81.0068 },
    area: { type: String, default: 'Vibhuti Khand, Gomti Nagar, Lucknow' },
    updatedAt: { type: Date, default: Date.now },
  },
  kycDetails: {
    drivingLicenseNumber: { type: String, default: '' },
    idType: { type: String, default: 'Aadhaar' },
    idNumber: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    bankOrUpi: { type: String, default: '' },
    submittedAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);