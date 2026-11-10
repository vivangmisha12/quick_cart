import axios from 'axios';

// Dynamically detect API URL: Vercel production default is '/api' (same domain), local dev is 'http://localhost:5000/api'
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({ baseURL: API_URL });
// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (name, email, phone, password, confirmPassword) =>
    api.post('/auth/register', { name, email, phone, password, confirmPassword }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
};

// Categories APIs
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
};

// Products APIs
export const productsAPI = {
  getAll: (categoryId = '', search = '', subcategoryId = '', trending = false) =>
    api.get('/products', { params: { categoryId, search, subcategoryId, trending } }),
  getById: (id) => api.get(`/products/${id}`),
  getByCategory: (categoryId) => api.get(`/products/category/${categoryId}`),
  getTrending: () => api.get('/products/trending'),
};

// Cart APIs
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity) =>
    api.post('/cart/add', { productId, quantity }),
  removeFromCart: (productId) =>
    api.delete('/cart/remove', { data: { productId } }),
  updateCartItem: (productId, quantity) =>
    api.put('/cart/update', { productId, quantity }),
  clearCart: () => api.delete('/cart/clear'),
};

// Orders APIs
export const ordersAPI = {
  createOrder: (orderData, paymentMethod) => {
    if (typeof orderData === 'object' && orderData.shippingAddress) {
      return api.post('/orders', orderData);
    }
    return api.post('/orders', { shippingAddress: orderData, paymentMethod });
  },
  getUserOrders: () => api.get('/orders'),
  createRazorpayOrder: (amount) =>
    api.post('/orders/razorpay/create-order', { amount }),
  verifyRazorpayPayment: (paymentData) =>
    api.post('/orders/razorpay/verify-payment', paymentData),
};

// Admin Orders APIs
export const adminOrdersAPI = {
  getAll: () => api.get('/orders/admin/all'),
  updateStatus: (id, status, deliveryPartner) =>
    api.put(`/orders/${id}/status`, { status, deliveryPartner }),
};

// Delivery Partner APIs
export const deliveryAPI = {
  getActiveOrders: () => api.get('/orders/delivery/active'),
  updateOrderStatus: (id, status, partnerInfo = {}) =>
    api.put(`/orders/delivery/${id}/status`, { status, ...partnerInfo }),
};

// Admin Users APIs
export const adminUsersAPI = {
  getCount: () => api.get('/users/admin/count'),
  getAll: () => api.get('/users/admin'),
};


// Admin APIs for Categories
export const adminCategoriesAPI = {
  create: (data) => api.post('/categories', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
  }),
  update: (id, data) => api.put(`/categories/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
  }),
  delete: (id) => api.delete(`/categories/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
  }),
  getAll: () => api.get('/categories'),
};

// Admin APIs for Products
export const adminProductsAPI = {
  create: (data) => api.post('/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/products/${id}`),
  getAll: () => api.get('/products'),
  getByCategory: (categoryId) => api.get(`/products/category/${categoryId}`),
};

export const bannersAPI = {
  getActive: () => api.get('/banners/active'),
  getAll: () => api.get('/banners'),
};

export const adminBannersAPI = {
  create: (data) => api.post('/banners', data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
  }),
  update: (id, data) => api.put(`/banners/${id}`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
    },
  }),
  delete: (id) => api.delete(`/banners/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
  }),
};

export default api;