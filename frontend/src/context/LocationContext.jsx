import React, { createContext, useContext, useMemo, useState } from 'react';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState('Husainabad, Lucknow');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [addressParts, setAddressParts] = useState({ street: '', city: '', state: '', country: '', zipcode: '' });
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      return resp;
    } finally {
      clearTimeout(id);
    }
  };

  const finishWithFallbackFactory = (resolve, reject) => async () => {
    try {
      setLocating(false);
      const fb = await fallbackNetworkLocation();
      setLocating(false);
      resolve(fb);
    } catch (err) {
      setLocating(false);
      reject(err);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    const tryNominatim = async () => {
      const url =
        'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&namedetails=1&lat=' +
        lat +
        '&lon=' +
        lng;

      const resp = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) return null;

      const data = await resp.json();
      const addr = data && data.address ? data.address : {};

      return {
        display: data && data.display_name ? data.display_name : '',
        road: addr.road || addr.neighbourhood || '',
        houseNumber: addr.house_number || '',
        city: addr.city || addr.town || addr.village || addr.suburb || '',
        state: addr.state || addr.region || '',
        country: addr.country || '',
        postcode: addr.postcode || '',
      };
    };

    const tryBigDataCloud = async () => {
      const url =
        'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
        lat +
        '&longitude=' +
        lng +
        '&localityLanguage=en';
      const resp = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) return null;
      const data = await resp.json();
      const admin = data.localityInfo?.administrative || [];
      const displayFromAdmin = admin.find((a) => a.order === 6)?.name || admin[2]?.name || '';
      const stateFromAdmin = admin.find((a) => a.order === 4)?.name || admin[1]?.name || '';
      const countryFromAdmin = admin.find((a) => a.order === 2)?.name || data.countryName || '';

      return {
        display: data.locality || data.city || displayFromAdmin || '',
        road: data.locality || data.city || '',
        houseNumber: '',
        city: data.city || data.locality || displayFromAdmin || '',
        state: stateFromAdmin,
        country: countryFromAdmin,
        postcode: data.postcode || '',
      };
    };

    try {
      const first = await tryNominatim();
      if (first) return first;
    } catch (_) {
      // ignore
    }

    try {
      const second = await tryBigDataCloud();
      if (second) return second;
    } catch (_) {
      // ignore
    }

    return null;
  };

  const fallbackNetworkLocation = async () => {
    try {
      // IP-based approximate location (no key). HTTPS to avoid mixed-content blocks.
      const resp = await fetchWithTimeout('https://ipapi.co/json/', {}, 6000);
      if (!resp.ok) throw new Error('ipapi failed');
      const data = await resp.json();
      const lat = data.latitude;
      const lng = data.longitude;
      const city = data.city || '';

      if (!lat || !lng) throw new Error('No coords from ipapi');

      setCoords({ lat, lng, accuracy: null });

      const resolved = await reverseGeocode(lat, lng);
      const streetLine = resolved
        ? `${resolved.houseNumber ? resolved.houseNumber + ' ' : ''}${resolved.road}`.trim()
        : '';
      const fallbackLabel = resolved?.display || streetLine || city || `Approx location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;

      setLocation(fallbackLabel);
      setFormattedAddress(resolved?.display || '');
      setAddressParts({
        street: streetLine,
        city: resolved?.city || city,
        state: resolved?.state || '',
        country: resolved?.country || '',
        zipcode: resolved?.postcode || '',
      });

      return { lat, lng, accuracy: null };
    } catch (e) {
      setError('Unable to determine location. Please allow GPS or enter address manually.');
      throw e;
    }
  };

  const detectLocation = () => {
  if (!navigator.geolocation) {
    const message = 'Geolocation not supported by this browser';
    setError(message);
    return Promise.reject(new Error(message));
  }

  // HTTPS/localhost check
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (window.location.protocol !== 'https:' && !isLocal) {
    const message = 'Please use HTTPS or localhost to allow location access.';
    setError(message);
    return Promise.reject(new Error(message));
  }

  setLocating(true);
  setError('');

  return new Promise((resolve, reject) => {
    const timeoutMs = 12000;
    let settled = false;

    const finishWithFallback = async () => {
      try {
        const fb = await fallbackNetworkLocation();
        settled = true;
        setLocating(false);
        resolve(fb);
      } catch (err) {
        settled = true;
        setLocating(false);
        reject(err);
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      setError('Location timed out. Trying network-based location…');
      finishWithFallback();
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setCoords({ lat, lng, accuracy });

        try {
          const resolved = await reverseGeocode(lat, lng);
          if (resolved) {
            const streetLine =
              (resolved.houseNumber ? resolved.houseNumber + ' ' : '') + (resolved.road || '');
            const cityZip = [resolved.city, resolved.state, resolved.country, resolved.postcode]
              .filter(Boolean)
              .join(', ');
            const label =
              resolved.display ||
              streetLine.trim() ||
              cityZip ||
              `Current location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;

            setLocation(label);
            setFormattedAddress(resolved.display || label);
            setAddressParts({
              street: streetLine.trim(),
              city: resolved.city || '',
              state: resolved.state || '',
              country: resolved.country || '',
              zipcode: resolved.postcode || '',
            });
            setLocating(false);
            resolve({ lat, lng, accuracy });
            return;
          }
        } catch (geErr) {
          setError('Geocoding failed, trying network-based location…');
        }

        await finishWithFallback();
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setError((err && err.message) || 'Unable to fetch location, trying network-based location…');
        finishWithFallback();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

  const value = useMemo(
    () => ({
      location,
      setLocation,
      formattedAddress,
      addressParts,
      coords,
      locating,
      error,
      detectLocation,
    }),
    [location, formattedAddress, addressParts, coords, locating, error]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocationContext = () => useContext(LocationContext);