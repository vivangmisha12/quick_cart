const express = require('express');
const router = express.Router();

// Lucknow default delivery hub
const LUCKNOW_DEFAULT = {
  lat: 26.8530,
  lng: 80.9984,
  display: 'Gomti Nagar, Lucknow, Uttar Pradesh',
  street: 'Gomti Nagar',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  country: 'India',
  zipcode: '226010'
};

// GET /api/location/reverse?lat=...&lng=...
// Backend reverse geocoding with ISP Gateway correction
router.get('/reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.json(LUCKNOW_DEFAULT);
    }

    // Check if browser/Wi-Fi router provided Jalandhar / Punjab ISP gateway coordinates
    const isJalandharGateway = 
      (lat >= 30.0 && lat <= 32.5 && lng >= 74.0 && lng <= 77.0);

    if (isJalandharGateway) {
      console.log(`[Location Backend] Detected Jalandhar ISP Gateway (${lat}, ${lng}). Correcting to Lucknow hub.`);
      return res.json({
        ...LUCKNOW_DEFAULT,
        wasIspCorrected: true
      });
    }

    // Try Photon reverse geocoding
    try {
      const photonRes = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
      if (photonRes.ok) {
        const data = await photonRes.json();
        const feat = data?.features?.[0];
        if (feat && feat.properties) {
          const props = feat.properties;
          const street = props.street || props.name || '';
          const locality = props.district || props.suburb || props.locality || '';
          const city = props.city || props.town || props.county || 'Lucknow';
          const state = props.state || 'Uttar Pradesh';
          const postcode = props.postcode || '';

          const parts = [street, locality, city, state].filter(Boolean);
          const uniqueParts = [...new Set(parts)];
          const display = uniqueParts.join(', ');

          return res.json({
            lat,
            lng,
            display: display || `${locality || city}, ${state}`,
            street: street || locality || city,
            city,
            state,
            country: props.country || 'India',
            zipcode: postcode,
          });
        }
      }
    } catch (e) {
      console.warn('[Location Backend] Photon error, falling back to OSM:', e.message);
    }

    // Fallback to OSM Nominatim
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'User-Agent': 'Blinkit-Node-Server/1.0' } }
      );
      if (osmRes.ok) {
        const data = await osmRes.json();
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.district || 'Lucknow';
        const state = addr.state || 'Uttar Pradesh';
        const parts = [road, city, state].filter(Boolean);

        return res.json({
          lat,
          lng,
          display: parts.join(', ') || data.display_name,
          street: road || city,
          city,
          state,
          country: addr.country || 'India',
          zipcode: addr.postcode || '',
        });
      }
    } catch (e) {
      console.warn('[Location Backend] OSM error:', e.message);
    }

    return res.json({
      lat,
      lng,
      display: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      city: 'Lucknow',
      state: 'Uttar Pradesh',
    });
  } catch (err) {
    console.error('[Location Backend Error]:', err);
    res.json(LUCKNOW_DEFAULT);
  }
});

// GET /api/location/current
router.get('/current', (req, res) => {
  res.json(LUCKNOW_DEFAULT);
});

module.exports = router;

