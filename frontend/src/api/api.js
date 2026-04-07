import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  createOrder: (shippingAddress, paymentMethod) =>
    api.post('/orders', { shippingAddress, paymentMethod }),
  getUserOrders: () => api.get('/orders'),
};

// Admin Orders APIs
export const adminOrdersAPI = {
  getAll: () => api.get('/orders/admin/all'),
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

export default api;