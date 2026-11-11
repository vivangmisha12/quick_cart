const User = require('../models/User');

const VALID_ADDRESS_LABELS = ['Home', 'Work', 'Other'];

const normalizeLabel = (label) => {
  if (!label) return 'Home';
  const match = VALID_ADDRESS_LABELS.find(
    (item) => item.toLowerCase() === String(label).trim().toLowerCase()
  );
  return match || 'Home';
};

const parseCoordinates = (coords) => {
  if (!coords) return undefined;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }
  return undefined;
};

const formatAddressEntry = (addr) => {
  if (!addr) return null;
  const obj = typeof addr.toObject === 'function' ? addr.toObject() : addr;
  const id = String(obj._id || obj.id || '');
  return {
    id,
    _id: obj._id || id,
    label: obj.label || 'Home',
    houseNo: obj.houseNo || '',
    area: obj.area || '',
    landmark: obj.landmark || '',
    street: obj.street || '',
    city: obj.city || '',
    state: obj.state || '',
    zipcode: obj.zipcode || '',
    country: obj.country || 'India',
    coordinates: obj.coordinates || undefined,
    isDefault: Boolean(obj.isDefault),
    lastUsedAt: obj.lastUsedAt || null,
  };
};

const normalizeShippingAddress = (rawAddress = {}, coords = null) => {
  const src = rawAddress && typeof rawAddress === 'object' ? rawAddress : {};
  const houseNo = String(src.houseNo || '').trim();
  const explicitArea = String(src.area || '').trim();
  const landmark = String(src.landmark || '').trim();
  const rawStreet = String(src.street || '').trim();
  const area = explicitArea || rawStreet;

  const composedParts = [];
  if (houseNo) composedParts.push(houseNo);
  if (area) composedParts.push(area);
  if (landmark) composedParts.push(`(Near ${landmark})`);

  const street = rawStreet || composedParts.join(', ');
  const finalStreet = houseNo && area && !rawStreet.toLowerCase().includes(houseNo.toLowerCase())
    ? composedParts.join(', ')
    : street || composedParts.join(', ');

  const coordinates = parseCoordinates(coords || src.coordinates);

  return {
    label: normalizeLabel(src.label || src.addressType),
    houseNo,
    area: area || finalStreet,
    landmark,
    street: finalStreet,
    city: String(src.city || '').trim(),
    state: String(src.state || '').trim(),
    zipcode: String(src.zipcode || '').trim(),
    country: String(src.country || 'India').trim() || 'India',
    ...(coordinates ? { coordinates } : {}),
  };
};

const isSameAddress = (existing, incoming) => {
  const norm = (val) => String(val || '').trim().toLowerCase();
  const sameZip = norm(existing.zipcode) === norm(incoming.zipcode);
  const sameCity = norm(existing.city) === norm(incoming.city);
  if (!sameZip || !sameCity) return false;

  const existingHouse = norm(existing.houseNo);
  const incomingHouse = norm(incoming.houseNo);
  const existingArea = norm(existing.area || existing.street);
  const incomingArea = norm(incoming.area || incoming.street);

  if (existingHouse && incomingHouse) {
    return existingHouse === incomingHouse && existingArea === incomingArea;
  }

  return norm(existing.street) === norm(incoming.street);
};

const upsertUserDeliveryAddress = async (userId, rawAddress = {}, coords = null, options = {}) => {
  try {
    if (!userId || typeof User?.findById !== 'function') return [];

    const user = await User.findById(userId);
    if (!user) return [];

    const normalized = normalizeShippingAddress(rawAddress, coords);
    if (!normalized.houseNo && !normalized.street && !normalized.area && !normalized.city) {
      return (user.addresses || []).map(formatAddressEntry);
    }

    if (!Array.isArray(user.addresses)) {
      user.addresses = [];
    }

    const editId = options.addressId ? String(options.addressId) : null;
    let existingIndex = -1;

    if (editId) {
      existingIndex = user.addresses.findIndex((a) => String(a._id) === editId);
    }
    if (existingIndex === -1) {
      existingIndex = user.addresses.findIndex((a) => isSameAddress(a, normalized));
    }

    const markDefault = Boolean(options.isDefault) || user.addresses.length === 0;
    if (markDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const entryPayload = {
      label: normalized.label,
      houseNo: normalized.houseNo,
      area: normalized.area,
      landmark: normalized.landmark,
      street: normalized.street,
      city: normalized.city,
      state: normalized.state,
      zipcode: normalized.zipcode,
      country: normalized.country,
      ...(normalized.coordinates ? { coordinates: normalized.coordinates } : {}),
      isDefault: markDefault,
      lastUsedAt: new Date(),
    };

    if (existingIndex >= 0) {
      const existing = user.addresses[existingIndex];
      const keepDefault = markDefault || Boolean(existing.isDefault);
      user.addresses.splice(existingIndex, 1);
      user.addresses.unshift({
        ...entryPayload,
        _id: existing._id,
        coordinates: normalized.coordinates || existing.coordinates,
        isDefault: keepDefault,
      });
    } else {
      user.addresses.unshift(entryPayload);
      if (user.addresses.length > 20) {
        user.addresses = user.addresses.slice(0, 20);
      }
    }

    await user.save();
    return user.addresses.map(formatAddressEntry);
  } catch (err) {
    console.warn('Could not sync delivery address to User document:', err.message);
    return [];
  }
};

module.exports = {
  formatAddressEntry,
  normalizeShippingAddress,
  upsertUserDeliveryAddress,
};

