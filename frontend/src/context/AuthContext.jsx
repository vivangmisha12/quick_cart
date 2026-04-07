import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext();

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
        const profile = response.data;
        setUser({
          id: profile.id || profile._id,
          name: profile.name,
          email: profile.email,
          isAdmin: Boolean(profile.isAdmin),
        });
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
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);