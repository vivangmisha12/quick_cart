import { useState } from 'react';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getReverseGeocode = async (latitude, longitude) => {
    try {
      // Nominatim API with more details
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      const address = data.address || {};
      
      // Extract street address components in priority order
      let street = '';
      if (address.road) {
        street = address.road;
      } else if (address.street) {
        street = address.street;
      } else if (address.pedestrian) {
        street = address.pedestrian;
      } else if (address.residential) {
        street = address.residential;
      }
      
      // Add house number if available
      if (address.house_number && street) {
        street = address.house_number + ', ' + street;
      }
      
      // Build locality
      let locality = '';
      if (address.village) {
        locality = address.village;
      } else if (address.suburb) {
        locality = address.suburb;
      } else if (address.town) {
        locality = address.town;
      }
      
      const city = address.city || address.county || 'Lucknow';
      
      // Build complete address
      const fullAddress = data.display_name || 'Address not found';
      
      return {
        street: street || fullAddress,
        locality: locality,
        city: city,
        state: address.state || 'Unknown',
        country: address.country || 'Unknown',
        fullAddress: fullAddress,
        postalCode: address.postcode || ''
      };
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  const getLocation = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Get reverse geocode info
        const geoData = await getReverseGeocode(latitude, longitude);
        
        setLocation({ 
          latitude: parseFloat(latitude.toFixed(6)), 
          longitude: parseFloat(longitude.toFixed(6)), 
          accuracy: parseFloat(accuracy.toFixed(0)),
          city: geoData?.city,
          state: geoData?.state,
          country: geoData?.country,
          fullAddress: geoData?.fullAddress
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        let errorMsg = 'Unable to get your location';
        if (err.code === 1) errorMsg = '🔒 Permission denied. Enable location access in browser settings.';
        if (err.code === 2) errorMsg = '📍 Location unavailable. Try:\n- Turn on Location Services\n- Disable VPN\n- Go outside for better signal\n- Refresh page and try again';
        if (err.code === 3) errorMsg = '⏱️ Request timeout. Try again or go to a location with better GPS signal.';
        
        setError(errorMsg);
        setLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const clearLocation = () => {
    setLocation(null);
    setError(null);
  };

  return { location, error, loading, getLocation, clearLocation };
};
