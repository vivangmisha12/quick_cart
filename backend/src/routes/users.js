const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const {
  formatAddressEntry,
  upsertUserDeliveryAddress,
} = require('../utils/userAddress');

const router = express.Router();

// Customer: get saved delivery addresses from User table
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('addresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      addresses: (user.addresses || []).map(formatAddressEntry).filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Customer: add or update a delivery address in User table
router.post('/addresses', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const coords = body.coordinates || (body.latitude && body.longitude
      ? { lat: body.latitude, lng: body.longitude }
      : null);
    const addresses = await upsertUserDeliveryAddress(req.userId, body, coords, {
      isDefault: Boolean(body.isDefault),
      addressId: body.id || body._id,
    });
    res.status(201).json({
      message: 'Delivery address saved to account',
      addresses,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Customer: update specific saved address in User table
router.put('/addresses/:addressId', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const coords = body.coordinates || (body.latitude && body.longitude
      ? { lat: body.latitude, lng: body.longitude }
      : null);
    const addresses = await upsertUserDeliveryAddress(req.userId, body, coords, {
      isDefault: Boolean(body.isDefault),
      addressId: req.params.addressId,
    });
    res.json({
      message: 'Address updated',
      addresses,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Customer: remove saved address from User table
router.delete('/addresses/:addressId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const targetId = String(req.params.addressId);
    user.addresses = (user.addresses || []).filter((addr) => String(addr._id) !== targetId);
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    res.json({
      message: 'Address removed',
      addresses: user.addresses.map(formatAddressEntry).filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: get total users count
router.get('/admin/count', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: list all delivery partners with active & completed trip counts
router.get('/admin/riders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const riders = await User.find({
      $or: [{ isDeliveryPartner: true }, { role: 'delivery_partner' }],
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const statsRows = await Order.aggregate([
      { $match: { 'deliveryPartner.id': { $ne: null } } },
      {
        $group: {
          _id: '$deliveryPartner.id',
          activeCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['assigned', 'packing', 'picked_up', 'out_for_delivery', 'shipped']] },
                1,
                0,
              ],
            },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = {};
    for (const row of statsRows) {
      if (row._id) {
        statsMap[row._id.toString()] = {
          activeCount: row.activeCount || 0,
          completedCount: row.completedCount || 0,
        };
      }
    }

    const enriched = riders.map((rider) => ({
      ...rider,
      activeOrdersCount: statsMap[rider._id.toString()]?.activeCount || 0,
      completedOrdersCount: statsMap[rider._id.toString()]?.completedCount || 0,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: create a new delivery partner (minimal onboarding: name, email, phone only)
router.post('/admin/riders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        message: 'Name, email, and phone number are required to create a delivery partner',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const temporaryPassword = process.env.DEFAULT_RIDER_PASSWORD || 'rider123';

    const rider = new User({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password: temporaryPassword,
      role: 'delivery_partner',
      isDeliveryPartner: true,
      verificationStatus: 'pending',
      onboardingCompleted: false,
      createdByAdmin: true,
      isOnline: false,
    });

    await rider.save();

    const safeRider = rider.toObject();
    delete safeRider.password;

    res.status(201).json({
      message: 'Delivery partner added! They will complete KYC & vehicle verification on first app login.',
      rider: safeRider,
      temporaryPassword,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: update delivery partner verification status (verified / pending / suspended)
router.patch('/admin/riders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { verificationStatus } = req.body;
    if (!['pending', 'verified', 'rejected', 'suspended'].includes(verificationStatus)) {
      return res.status(400).json({ message: 'Invalid verification status' });
    }

    const updateFields = { verificationStatus };
    if (verificationStatus === 'verified') {
      updateFields.onboardingCompleted = true;
    } else if (['suspended', 'rejected'].includes(verificationStatus)) {
      updateFields.isOnline = false;
    }

    const rider = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).select('-password');

    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json({ message: `Rider marked as ${verificationStatus}`, rider });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: list all users
router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
