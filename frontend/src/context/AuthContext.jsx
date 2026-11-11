import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext();

const normalizeAddresses = (list = []) => {
  if (!Array.isArray(list)) return [];
  return list.map((addr) => ({
    ...addr,
    id: String(addr.id || addr._id || Date.now()),
  }));
};

const syncAddressesCache = (userId, addresses = []) => {
  if (!userId || !Array.isArray(addresses)) return;
  try {
    const normalized = normalizeAddresses(addresses);
    if (normalized.length > 0) {
      localStorage.setItem(`savedAddresses_${userId}`, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent('addressesUpdated', { detail: normalized }));
    }
  } catch (e) {}
};

const normalizeUser = (profile) => {
  if (!profile) return null;
  const isDelivery = Boolean(profile.isDeliveryPartner || profile.role === 'delivery_partner');
  return {
    id: profile.id || profile._id,
    _id: profile._id || profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    addresses: normalizeAddresses(profile.addresses),
    isAdmin: Boolean(profile.isAdmin),
    isDeliveryPartner: isDelivery,
    role: profile.role || (profile.isAdmin ? 'admin' : isDelivery ? 'delivery_partner' : 'customer'),
    vehicleType: profile.vehicleType || '',
    vehicleNumber: profile.vehicleNumber || '',
    verificationStatus: profile.verificationStatus || (isDelivery ? 'pending' : 'verified'),
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    createdByAdmin: Boolean(profile.createdByAdmin),
    isOnline: Boolean(profile.isOnline),
    assignedHub: profile.assignedHub || 'Dark Store #04 • Vibhuti Khand, Lucknow',
    currentLocation: profile.currentLocation || null,
    kycDetails: profile.kycDetails || {},
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    const hydrateUser = async () => {
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const response = await authAPI.getProfile();
        const normalized = normalizeUser(response.data);
        setUser(normalized);
        if (normalized?.addresses?.length > 0) {
          syncAddressesCache(normalized.id, normalized.addresses);
        }
      } catch (error) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    };

    hydrateUser();
  }, [token]);

  const register = async (name, email, phone, password, confirmPassword) => {
    setLoading(true);
    try {
      const response = await authAPI.register(name, email, phone, password, confirmPassword);
      const { token: newToken, user: regUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(normalizeUser(regUser));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    } finally {
      setLoading(false);
    }
  };

  const registerDelivery = async (payload) => {
    setLoading(true);
    try {
      const response = await authAPI.registerDelivery(payload);
      const { token: newToken, user: regUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(normalizeUser(regUser));
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, portal = '') => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password, portal);
      const { token: newToken, user: loggedUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      const normalized = normalizeUser(loggedUser);
      setUser(normalized);
      if (normalized?.addresses?.length > 0) {
        syncAddressesCache(normalized.id, normalized.addresses);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updated) => {
    setUser((prev) => {
      const next = normalizeUser({ ...(prev || {}), ...(updated || {}) });
      if (updated?.addresses && next?.id) {
        syncAddressesCache(next.id, next.addresses);
      }
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, token, register, registerDelivery, login, updateUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
