const Order = require('../models/Order');
const User = require('../models/User');

const ASSIGNMENT_TIMEOUT_MS = 120 * 1000; // 120 seconds accept SLA

const STORE_HUBS = [
  {
    id: 'hub_vibhuti',
    name: 'Dark Store #04 • Vibhuti Khand',
    address: 'Vibhuti Khand, Gomti Nagar, Lucknow',
    lat: 26.8602,
    lng: 81.0068,
    keywords: ['gomti', 'vibhuti', '226010', 'chinhat'],
  },
  {
    id: 'hub_indiranagar',
    name: 'Dark Store #07 • Indira Nagar',
    address: 'Sector 16, Indira Nagar, Lucknow',
    lat: 26.8851,
    lng: 80.9924,
    keywords: ['indira', '226016', 'munshi', 'polytechnic'],
  },
  {
    id: 'hub_hazratganj',
    name: 'Dark Store #02 • Hazratganj',
    address: 'MG Marg, Hazratganj, Lucknow',
    lat: 26.8467,
    lng: 80.9462,
    keywords: ['hazratganj', 'charbagh', '226001', 'aminabad'],
  },
  {
    id: 'hub_aliganj',
    name: 'Dark Store #11 • Aliganj',
    address: 'Kapurthala Crossing, Aliganj, Lucknow',
    lat: 26.8906,
    lng: 80.9421,
    keywords: ['aliganj', 'kapurthala', 'jankipuram', '226024'],
  },
  {
    id: 'hub_alambagh',
    name: 'Dark Store #09 • Alambagh',
    address: 'Phoenix Road, Alambagh, Lucknow',
    lat: 26.8142,
    lng: 80.9036,
    keywords: ['alambagh', 'ashiyana', '226005', 'krishna'],
  },
];

let lastSweepAt = 0;
let sweepInFlight = null;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lng2 !== 'number' ||
    Number.isNaN(lat1) ||
    Number.isNaN(lng1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lng2)
  ) {
    return 1.5;
  }

  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function resolveOrderCoordinates(shippingAddress = {}, providedCoords = null) {
  const lat = Number(providedCoords?.lat);
  const lng = Number(providedCoords?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }

  const text = `${shippingAddress.street || ''} ${shippingAddress.city || ''} ${shippingAddress.zipcode || ''}`.toLowerCase();
  for (const hub of STORE_HUBS) {
    if (hub.keywords.some((kw) => text.includes(kw))) {
      return { lat: hub.lat, lng: hub.lng };
    }
  }

  return { lat: STORE_HUBS[0].lat, lng: STORE_HUBS[0].lng };
}

function pickNextHub(targetCoords, attemptedHubIds = [], lastHubId = null) {
  const attemptedSet = new Set(attemptedHubIds);
  let candidates = STORE_HUBS.filter((h) => !attemptedSet.has(h.id));

  if (candidates.length === 0) {
    candidates = lastHubId
      ? STORE_HUBS.filter((h) => h.id !== lastHubId)
      : [...STORE_HUBS];
  }

  candidates.sort(
    (a, b) =>
      calculateDistanceKm(targetCoords.lat, targetCoords.lng, a.lat, a.lng) -
      calculateDistanceKm(targetCoords.lat, targetCoords.lng, b.lat, b.lng)
  );

  const chosen = candidates[0] || STORE_HUBS[0];
  return {
    id: chosen.id,
    name: chosen.name,
    address: chosen.address,
    lat: chosen.lat,
    lng: chosen.lng,
  };
}

async function getActiveRiderLoadMap() {
  const rows = await Order.aggregate([
    {
      $match: {
        status: { $in: ['assigned', 'packing', 'picked_up', 'out_for_delivery', 'shipped'] },
        'deliveryPartner.id': { $ne: null },
      },
    },
    { $group: { _id: '$deliveryPartner.id', count: { $sum: 1 } } },
  ]);

  const map = {};
  for (const row of rows) {
    if (row._id) {
      map[row._id.toString()] = row.count;
    }
  }
  return map;
}

async function pickNearestSuitableRider(targetCoords, excludeRiderIds = [], lastFailedRiderId = null) {
  const allVerifiedRiders = await User.find({
    $or: [{ isDeliveryPartner: true }, { role: 'delivery_partner' }],
    verificationStatus: 'verified',
  })
    .select('name phone vehicleNumber currentLocation isOnline assignedHub')
    .lean();

  if (!allVerifiedRiders || allVerifiedRiders.length === 0) {
    return null;
  }

  const excludedSet = new Set(excludeRiderIds.map((id) => id.toString()));
  let candidates = allVerifiedRiders.filter((r) => !excludedSet.has(r._id.toString()));

  // If every verified rider was already tried once, reset pool excluding just-timed-out rider
  if (candidates.length === 0) {
    const others = lastFailedRiderId
      ? allVerifiedRiders.filter((r) => r._id.toString() !== lastFailedRiderId.toString())
      : [];
    candidates = others.length > 0 ? others : allVerifiedRiders;
  }

  const onlineCandidates = candidates.filter((r) => r.isOnline);
  const pool = onlineCandidates.length > 0 ? onlineCandidates : candidates;

  const loadMap = await getActiveRiderLoadMap();

  const ranked = pool
    .map((rider) => {
      const rLat = rider.currentLocation?.lat ?? STORE_HUBS[0].lat;
      const rLng = rider.currentLocation?.lng ?? STORE_HUBS[0].lng;
      const distanceKm = calculateDistanceKm(targetCoords.lat, targetCoords.lng, rLat, rLng);
      const activeCount = loadMap[rider._id.toString()] || 0;
      const suitabilityScore = distanceKm + activeCount * 0.75;
      return { rider, distanceKm, activeCount, suitabilityScore };
    })
    .sort((a, b) => a.suitabilityScore - b.suitabilityScore);

  return ranked[0] || null;
}

async function assignOrderAutomatically(order, options = {}) {
  const { reason = 'Initial automatic dispatch', excludeLastRiderId = null, lastHubId = null, resetRiderHistory = false } = options;

  const coords = resolveOrderCoordinates(order.shippingAddress, order.deliveryCoordinates);
  order.deliveryCoordinates = coords;

  if (!order.assignment) {
    order.assignment = {
      rerouteCount: 0,
      attemptedRiderIds: [],
      attemptedHubIds: [],
      logs: [],
    };
  }

  const attemptedHubIds = (order.assignment.attemptedHubIds || []).map(String);
  const selectedHub = pickNextHub(coords, attemptedHubIds, lastHubId);

  const attemptedRiderIds = resetRiderHistory
    ? []
    : (order.assignment.attemptedRiderIds || []).map((id) => id.toString());

  // Use customer drop location + selected hub to pick nearest suitable rider
  const targetForRider = {
    lat: (coords.lat + selectedHub.lat) / 2,
    lng: (coords.lng + selectedHub.lng) / 2,
  };

  const match = await pickNearestSuitableRider(targetForRider, attemptedRiderIds, excludeLastRiderId);

  const now = new Date();
  order.assignedHub = selectedHub;
  order.assignment.assignedAt = now;
  order.assignment.expiresAt = new Date(now.getTime() + ASSIGNMENT_TIMEOUT_MS);
  order.assignment.acceptedAt = null;
  order.updatedAt = now;

  if (match && match.rider) {
    order.deliveryPartner = {
      id: match.rider._id,
      name: match.rider.name,
      phone: match.rider.phone,
      vehicleNumber: match.rider.vehicleNumber || 'UP-32-BK-1001',
      distanceKm: match.distanceKm,
    };
    order.status = 'assigned';
    order.assignment.logs.push({
      message: `${reason}: Auto-assigned to ${match.rider.name} (${match.distanceKm} km)`,
      hubName: selectedHub.name,
      riderName: match.rider.name,
      distanceKm: match.distanceKm,
      timestamp: now,
    });
  } else {
    order.deliveryPartner = {
      id: undefined,
      name: 'Awaiting Verified Rider',
      phone: '',
      vehicleNumber: '',
      distanceKm: 0,
    };
    order.status = 'confirmed';
    order.assignment.logs.push({
      message: `${reason}: Routed to ${selectedHub.name} (no verified rider online yet)`,
      hubName: selectedHub.name,
      riderName: 'Pending Rider',
      distanceKm: 0,
      timestamp: now,
    });
  }

  await order.save();
  return order;
}

async function rerouteOrderToNext(orderOrId, reason = 'No acceptance within 120s — auto re-routed to next location') {
  const order = typeof orderOrId === 'string' || !orderOrId.save
    ? await Order.findById(orderOrId)
    : orderOrId;

  if (!order) return null;

  if (!['pending', 'confirmed', 'assigned'].includes(order.status) || order.assignment?.acceptedAt) {
    return order;
  }

  if (!order.assignment) {
    order.assignment = {
      rerouteCount: 0,
      attemptedRiderIds: [],
      attemptedHubIds: [],
      logs: [],
    };
  }

  const prevRiderId = order.deliveryPartner?.id;
  const prevHubId = order.assignedHub?.id;

  if (prevRiderId && !order.assignment.attemptedRiderIds.some((id) => id.toString() === prevRiderId.toString())) {
    order.assignment.attemptedRiderIds.push(prevRiderId);
  }
  if (prevHubId && !order.assignment.attemptedHubIds.includes(prevHubId)) {
    order.assignment.attemptedHubIds.push(prevHubId);
  }

  order.assignment.rerouteCount = (order.assignment.rerouteCount || 0) + 1;
  order.assignment.lastRerouteReason = reason;

  // Cycle hub list cleanly if all hubs have been tried
  if (order.assignment.attemptedHubIds.length >= STORE_HUBS.length) {
    order.assignment.attemptedHubIds = prevHubId ? [prevHubId] : [];
  }

  return await assignOrderAutomatically(order, {
    reason: `Re-route #${order.assignment.rerouteCount} (${reason})`,
    excludeLastRiderId: prevRiderId,
    lastHubId: prevHubId,
  });
}

async function rerouteExpiredOrders(force = false) {
  const nowMs = Date.now();
  if (!force && sweepInFlight) {
    return sweepInFlight;
  }
  if (!force && nowMs - lastSweepAt < 5000) {
    return 0;
  }

  lastSweepAt = nowMs;

  const run = async () => {
    try {
      const now = new Date();
      const legacyCutoff = new Date(now.getTime() - ASSIGNMENT_TIMEOUT_MS);

      const expiredOrders = await Order.find({
        status: { $in: ['pending', 'confirmed', 'assigned'] },
        $or: [{ 'assignment.acceptedAt': null }, { 'assignment.acceptedAt': { $exists: false } }],
        $and: [
          {
            $or: [
              { 'assignment.expiresAt': { $lte: now } },
              { 'assignment.expiresAt': null, createdAt: { $lte: legacyCutoff } },
              { 'assignment.expiresAt': { $exists: false }, createdAt: { $lte: legacyCutoff } },
            ],
          },
        ],
      }).limit(25);

      for (const ord of expiredOrders) {
        await rerouteOrderToNext(
          ord,
          'Vendor/Rider did not accept within 120s — auto re-routed to next hub & nearest rider'
        );
      }

      return expiredOrders.length;
    } catch (err) {
      console.error('[AutoReroute] Sweep notice:', err.message);
      return 0;
    } finally {
      sweepInFlight = null;
    }
  };

  sweepInFlight = run();
  return sweepInFlight;
}

module.exports = {
  ASSIGNMENT_TIMEOUT_MS,
  STORE_HUBS,
  calculateDistanceKm,
  resolveOrderCoordinates,
  assignOrderAutomatically,
  rerouteOrderToNext,
  rerouteExpiredOrders,
};

