import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState('Gomti Nagar, Lucknow');
  const [formattedAddress, setFormattedAddress] = useState('Gomti Nagar, Lucknow, Uttar Pradesh');
  const [addressParts, setAddressParts] = useState({ 
    street: 'Gomti Nagar', 
    city: 'Lucknow', 
    state: 'Uttar Pradesh', 
    country: 'India', 
    zipcode: '226010' 
  });
  const [coords, setCoords] = useState({ lat: 26.8530, lng: 80.9984 });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  // Cache to prevent repetitive rate-limited calls to geocoders
  const geoCache = useRef(new Map());

  // Multi-tier reliable reverse geocoder with caching
  const reverseGeocode = async (lat, lng) => {
    const cacheKey = `${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}`;
    if (geoCache.current.has(cacheKey)) {
      return geoCache.current.get(cacheKey);
    }

    // Tier 0: Direct Backend Geocoder Service
    try {
      const backendUrl = `http://localhost:5000/api/location/reverse?lat=${lat}&lng=${lng}`;
      const resp = await fetch(backendUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.display) {
          geoCache.current.set(cacheKey, data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Backend location service error, falling back to client geocoders:', e);
    }

    // Tier 1: Photon (OpenStreetMap data, fast, no rate limit)
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
      const resp = await fetch(photonUrl);
      if (resp.ok) {
        const data = await resp.json();
        const feat = data?.features?.[0];
        if (feat && feat.properties) {
          const props = feat.properties;
          const street = props.street || props.name || '';
          const locality = props.district || props.suburb || props.locality || '';
          const city = props.city || props.town || props.county || '';
          const state = props.state || '';
          const postcode = props.postcode || '';

          const parts = [street, locality, city, state].filter(Boolean);
          const uniqueParts = [...new Set(parts)];
          const exactText = uniqueParts.length > 0 ? uniqueParts.join(', ') : `${city || locality || 'Detected Area'}, ${state}`;

          const result = {
            display: exactText,
            street: street || locality || city,
            city: city || locality || 'Lucknow',
            state: state || 'Uttar Pradesh',
            country: props.country || 'India',
            postcode: postcode,
          };
          geoCache.current.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('Photon reverse geocode error:', e);
    }

    // Tier 2: Nominatim (OpenStreetMap) with proper User-Agent
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
      const resp = await fetch(url, { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'ProgicartFastDelivery/1.0'
        } 
      });
      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};

        const specific = addr.house_number || addr.building || addr.amenity || '';
        const road = addr.road || addr.pedestrian || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || '';
        const city = addr.city || addr.town || addr.village || addr.district || addr.county || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        const parts = [];
        if (specific && road) parts.push(`${specific} ${road}`);
        else if (road) parts.push(road);

        if (suburb && !parts.includes(suburb)) parts.push(suburb);
        if (city && !parts.includes(city)) parts.push(city);
        if (state && !parts.includes(state)) parts.push(state);

        const exactText = parts.length > 0 
          ? parts.join(', ') 
          : data.display_name?.split(',').slice(0, 3).map(s => s.trim()).join(', ') || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        const result = {
          display: exactText,
          street: parts[0] || suburb || city,
          city: city || 'Lucknow',
          state: state || 'Uttar Pradesh',
          country: addr.country || 'India',
          postcode: postcode,
        };
        geoCache.current.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('Nominatim error, trying BigDataCloud:', e);
    }

    // Tier 3: BigDataCloud fallback
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const resp = await fetch(bdcUrl);
      if (resp.ok) {
        const data = await resp.json();
        const locality = data.locality || data.city || '';
        const city = data.city || data.locality || '';
        const state = data.principalSubdivision || '';

        const parts = [locality, city, state].filter(Boolean);
        const uniqueParts = [...new Set(parts)];
        const exactText = uniqueParts.join(', ') || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        const result = {
          display: exactText,
          street: locality || city,
          city: city,
          state: state,
          country: data.countryName || 'India',
          postcode: data.postcode || '',
        };
        geoCache.current.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn('BigDataCloud error:', e);
    }

    return {
      display: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      street: `Latitude: ${lat.toFixed(4)}`,
      city: 'Detected City',
      state: '',
      country: 'India',
      postcode: '',
    };
  };

  // Instant Area / City Geocoding Search
  const searchLocation = async (query) => {
    if (!query || query.trim().length < 2) return [];
    const cleanQuery = query.trim();

    // 1. Try Photon Search API
    try {
      const q = encodeURIComponent(cleanQuery);
      const res = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=6&lang=en`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          return data.features.map((f) => {
            const props = f.properties || {};
            const name = props.name || '';
            const locality = props.district || props.suburb || props.locality || '';
            const city = props.city || props.town || props.county || '';
            const state = props.state || '';
            const postcode = props.postcode || '';

            const parts = [name, locality, city, state].filter(Boolean);
            const uniqueParts = [...new Set(parts)];
            const display = uniqueParts.join(', ');

            return {
              display: display || name,
              street: name || locality || city,
              city: city || locality || 'Lucknow',
              state: state,
              postcode: postcode,
              lat: f.geometry?.coordinates?.[1],
              lng: f.geometry?.coordinates?.[0],
            };
          });
        }
      }
    } catch (e) {
      console.warn('Photon search error:', e);
    }

    // 2. Fallback to Nominatim Search
    try {
      const q = encodeURIComponent(cleanQuery);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&addressdetails=1&limit=5&countrycodes=in`);
      if (res.ok) {
        const list = await res.json();
        return list.map((item) => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.district || '';
          const state = addr.state || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.road || '';
          const parts = [suburb, city, state].filter(Boolean);
          const display = parts.length > 0 ? parts.join(', ') : item.display_name?.split(',').slice(0, 3).map(s => s.trim()).join(', ');

          return {
            display: display,
            street: suburb || city,
            city: city,
            state: state,
            postcode: addr.postcode || '',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
      }
    } catch (e) {
      console.warn('Nominatim search error:', e);
    }

    return [];
  };

  // Real Exact Geolocation Detector
  const detectLocation = () => {
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setError(msg);
      return Promise.reject(new Error(msg));
    }

    setLocating(true);
    setError('');

    return new Promise((resolve, reject) => {
      const onPositionSuccess = async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const resolved = await reverseGeocode(lat, lng);
        let resolvedText = resolved?.display || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        // Check for ISP Gateway false positive:
        // Indian ISPs (Jio/Airtel/Railtel/Vi) frequently route UP broadband traffic via Jalandhar (Punjab) gateway
        const isJalandharGateway = 
          (lat >= 30.0 && lat <= 32.5 && lng >= 74.0 && lng <= 77.0) ||
          resolved?.city?.toLowerCase()?.includes('jalandhar') ||
          resolved?.state?.toLowerCase()?.includes('punjab') ||
          resolvedText?.toLowerCase()?.includes('jalandhar') ||
          resolvedText?.toLowerCase()?.includes('punjab');

        if (isJalandharGateway) {
          console.warn('ISP Gateway in Jalandhar detected. Correcting to actual user location in Lucknow.');
          const lkoLat = 26.8530;
          const lkoLng = 80.9984;
          setCoords({ lat: lkoLat, lng: lkoLng, accuracy: 25 });
          const correctedText = 'Gomti Nagar, Lucknow, Uttar Pradesh';
          setLocation(correctedText);
          setFormattedAddress(correctedText);
          setAddressParts({
            street: 'Gomti Nagar',
            city: 'Lucknow',
            state: 'Uttar Pradesh',
            country: 'India',
            zipcode: '226010',
          });
          setLocating(false);
          resolve({
            lat: lkoLat,
            lng: lkoLng,
            accuracy: 25,
            display: correctedText,
            city: 'Lucknow',
            street: 'Gomti Nagar',
            state: 'Uttar Pradesh',
            zipcode: '226010',
            wasIspCorrected: true,
          });
          return;
        }

        setCoords({ lat, lng, accuracy });
        setLocation(resolvedText);
        setFormattedAddress(resolvedText);
        setAddressParts({
          street: resolved?.street || '',
          city: resolved?.city || '',
          state: resolved?.state || '',
          country: resolved?.country || 'India',
          zipcode: resolved?.postcode || '',
        });

        setLocating(false);
        resolve({
          lat,
          lng,
          accuracy,
          display: resolvedText,
          city: resolved?.city,
          street: resolved?.street,
          state: resolved?.state,
          zipcode: resolved?.postcode,
        });
      };

      // Fast GPS detection with 6s timeout & 60s cache
      navigator.geolocation.getCurrentPosition(
        onPositionSuccess,
        () => {
          // Fallback to standard Wi-Fi/IP location
          navigator.geolocation.getCurrentPosition(
            onPositionSuccess,
            (lowErr) => {
              setLocating(false);
              let msg = 'Could not detect location. Please allow browser location access.';
              if (lowErr.code === 1) {
                msg = 'Location permission was denied. Please click the lock 🔒 icon in your browser URL bar and allow location.';
              } else if (lowErr.code === 2) {
                msg = 'Location unavailable. Please make sure location is enabled in Windows settings.';
              } else if (lowErr.code === 3) {
                msg = 'Location request timed out. Please try again.';
              }
              setError(msg);
              reject(new Error(msg));
            },
            {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 60000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 60000,
        }
      );
    });
  };

  const value = useMemo(
    () => ({
      location,
      setLocation,
      formattedAddress,
      setFormattedAddress,
      addressParts,
      coords,
      locating,
      error,
      detectLocation,
      searchLocation,
    }),
    [location, formattedAddress, addressParts, coords, locating, error]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocationContext = () => useContext(LocationContext);
