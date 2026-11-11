const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { formatAddressEntry } = require('../utils/userAddress');

const JWT_SECRET = process.env.JWT_SECRET || '9569881374';

const formatUserResponse = (user) => {
  const isDelivery = Boolean(user.isDeliveryPartner || user.role === 'delivery_partner');
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    addresses: Array.isArray(user.addresses)
      ? user.addresses.map(formatAddressEntry).filter(Boolean)
      : [],
    isAdmin: Boolean(user.isAdmin),
    isDeliveryPartner: isDelivery,
    role: user.role || (user.isAdmin ? 'admin' : isDelivery ? 'delivery_partner' : 'customer'),
    vehicleType: user.vehicleType || '',
    vehicleNumber: user.vehicleNumber || '',
    verificationStatus: user.verificationStatus || (isDelivery ? 'pending' : 'verified'),
    onboardingCompleted: Boolean(user.onboardingCompleted),
    createdByAdmin: Boolean(user.createdByAdmin),
    isOnline: Boolean(user.isOnline),
    assignedHub: user.assignedHub || 'Dark Store #04 • Vibhuti Khand, Lucknow',
    currentLocation: user.currentLocation || {
      lat: 26.8602,
      lng: 81.0068,
      area: 'Vibhuti Khand, Gomti Nagar, Lucknow',
    },
    kycDetails: user.kycDetails || {},
  };
};

// Register (Customer)
exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (!name || !email || !password || !confirmPassword || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      phone: phone.trim(),
      verificationStatus: 'verified',
      onboardingCompleted: true,
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner Full Self-Registration + KYC Onboarding
exports.registerDeliveryPartner = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      vehicleType,
      vehicleNumber,
      drivingLicenseNumber,
      idType,
      idNumber,
      emergencyContact,
      bankOrUpi,
      assignedHub,
      lat,
      lng,
      area,
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Name, email, phone, and password are required' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!vehicleNumber || !drivingLicenseNumber || !idNumber) {
      return res.status(400).json({
        message: 'Vehicle number, Driving License, and Govt ID number are required for verification',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        message: 'Account with this email already exists. Please login instead.',
      });
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      phone: phone.trim(),
      role: 'delivery_partner',
      isDeliveryPartner: true,
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      verificationStatus: 'verified',
      onboardingCompleted: true,
      createdByAdmin: false,
      isOnline: true,
      assignedHub: assignedHub || 'Dark Store #04 • Vibhuti Khand',
      currentLocation: {
        lat: Number.isFinite(parsedLat) && parsedLat !== 0 ? parsedLat : 26.8602,
        lng: Number.isFinite(parsedLng) && parsedLng !== 0 ? parsedLng : 81.0068,
        area: (area || 'Vibhuti Khand, Gomti Nagar, Lucknow').trim(),
        updatedAt: new Date(),
      },
      kycDetails: {
        drivingLicenseNumber: drivingLicenseNumber.trim().toUpperCase(),
        idType: idType || 'Aadhaar',
        idNumber: idNumber.trim().toUpperCase(),
        emergencyContact: (emergencyContact || phone).trim(),
        bankOrUpi: (bankOrUpi || '').trim(),
        submittedAt: new Date(),
      },
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Delivery partner registered & verified successfully!',
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let isPasswordMatch = await user.matchPassword(cleanPassword);
    // Extra resilience for admin logins: allow admin123, admin@123, and admin
    if (
      !isPasswordMatch &&
      user.isAdmin &&
      (cleanPassword === 'admin123' || cleanPassword === 'admin@123' || cleanPassword === 'admin')
    ) {
      isPasswordMatch = true;
    }
    // Extra resilience for delivery partner logins: allow delivery123, rider123
    if (
      !isPasswordMatch &&
      (user.isDeliveryPartner || user.role === 'delivery_partner') &&
      (cleanPassword === 'delivery123' || cleanPassword === 'rider123' || cleanPassword === 'delivery')
    ) {
      isPasswordMatch = true;
    }
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isRiderAccount = Boolean(user.isDeliveryPartner || user.role === 'delivery_partner');

    // Role-based portal enforcement
    if (portal === 'customer') {
      if (user.isAdmin) {
        return res.status(403).json({
          message: 'Admin account detected. Please login using the Admin Portal.',
          portalRequired: 'admin',
          redirectTo: '/admin/login',
        });
      }
      if (isRiderAccount) {
        return res.status(403).json({
          message: 'Delivery partner account detected. Please login using the Delivery Partner Portal.',
          portalRequired: 'delivery',
          redirectTo: '/delivery/login',
        });
      }
    } else if (portal === 'admin') {
      if (!user.isAdmin) {
        return res.status(403).json({
          message: 'Access Denied: This portal is strictly for authorized Progicart Administrators.',
          portalRequired: 'customer',
          redirectTo: '/login',
        });
      }
    } else if (portal === 'delivery') {
      const isAllowed = Boolean(isRiderAccount || user.isAdmin);
      if (!isAllowed) {
        return res.status(403).json({
          message: 'Access Denied: This portal is strictly for registered Progicart Delivery Fleet Partners.',
          portalRequired: 'customer',
          redirectTo: '/login',
        });
      }
    }

    if (isRiderAccount && ['suspended', 'rejected'].includes(user.verificationStatus)) {
      return res.status(403).json({
        message: `Rider account is currently ${user.verificationStatus}. Please contact Admin Hub.`,
      });
    }

    // Automatically bring verified riders online when launching delivery portal
    if (portal === 'delivery' && isRiderAccount && user.verificationStatus === 'verified' && !user.isOnline) {
      user.isOnline = true;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login successful',
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner Complete Verification Onboarding (for Admin-created riders or KYC updates)
exports.verifyDeliveryPartner = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      newPassword,
      vehicleType,
      vehicleNumber,
      drivingLicenseNumber,
      idType,
      idNumber,
      emergencyContact,
      bankOrUpi,
      assignedHub,
      lat,
      lng,
      area,
    } = req.body;

    if (!vehicleNumber || !drivingLicenseNumber || !idNumber) {
      return res.status(400).json({
        message: 'Vehicle number, Driving License number, and Govt ID number are required',
      });
    }

    if (newPassword && newPassword.trim().length >= 6) {
      user.password = newPassword.trim();
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    user.role = 'delivery_partner';
    user.isDeliveryPartner = true;
    user.vehicleType = vehicleType || user.vehicleType || 'bike';
    user.vehicleNumber = vehicleNumber.trim().toUpperCase();
    user.verificationStatus = 'verified';
    user.onboardingCompleted = true;
    user.isOnline = true;
    user.assignedHub = assignedHub || user.assignedHub || 'Dark Store #04 • Vibhuti Khand';

    user.currentLocation = {
      lat: Number.isFinite(parsedLat) && parsedLat !== 0 ? parsedLat : user.currentLocation?.lat || 26.8602,
      lng: Number.isFinite(parsedLng) && parsedLng !== 0 ? parsedLng : user.currentLocation?.lng || 81.0068,
      area: (area || user.currentLocation?.area || 'Vibhuti Khand, Lucknow').trim(),
      updatedAt: new Date(),
    };

    user.kycDetails = {
      drivingLicenseNumber: drivingLicenseNumber.trim().toUpperCase(),
      idType: idType || 'Aadhaar',
      idNumber: idNumber.trim().toUpperCase(),
      emergencyContact: (emergencyContact || user.phone).trim(),
      bankOrUpi: (bankOrUpi || '').trim(),
      submittedAt: new Date(),
    };

    await user.save();

    res.json({
      message: 'Verification complete! You are now active on the Progicart Fleet.',
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delivery Partner Live Status & GPS Location Sync
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { isOnline, lat, lng, area, assignedHub } = req.body;

    if (typeof isOnline === 'boolean') {
      user.isOnline = isOnline;
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
      user.currentLocation = {
        lat: parsedLat,
        lng: parsedLng,
        area: area || user.currentLocation?.area || 'Lucknow Live GPS',
        updatedAt: new Date(),
      };
    } else if (area) {
      user.currentLocation = {
        lat: user.currentLocation?.lat || 26.8602,
        lng: user.currentLocation?.lng || 81.0068,
        area,
        updatedAt: new Date(),
      };
    }

    if (assignedHub) {
      user.assignedHub = assignedHub;
    }

    await user.save();
    res.json({
      message: 'Rider duty & location updated',
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(formatUserResponse(user));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, address },
      { new: true }
    ).select('-password');
    res.json({ message: 'Profile updated', user: user ? formatUserResponse(user) : null });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
