import axios from 'axios';

// Production API URL: connects directly to live Render backend 'https://quick-cart-qnz6.onrender.com/api'
const API_URL = import.meta.env.VITE_API_URL || 'https://quick-cart-qnz6.onrender.com/api';

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

const rateLimitedGetUntil = new Map();
let lastToastDispatchedAt = 0;

const normalizeRateLimitKey = (config) => {
  const rawUrl = String(config?.url || '').split('?')[0];
  return `${String(config?.method || 'get').toLowerCase()}:${rawUrl}`;
};

const parseRetryAfterSeconds = (response) => {
  const fromBody = Number(response?.data?.retryAfterSeconds);
  if (Number.isFinite(fromBody) && fromBody > 0) {
    return Math.ceil(fromBody);
  }
  const fromHeader = Number(response?.headers?.['retry-after']);
  if (Number.isFinite(fromHeader) && fromHeader > 0) {
    return Math.ceil(fromHeader);
  }
  return 15;
};

// Add auth token and skip redundant GET polling requests during active 429 cooldown
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get') {
    const key = normalizeRateLimitKey(config);
    const blockedUntil = rateLimitedGetUntil.get(key) || 0;
    const remainingMs = blockedUntil - Date.now();
    if (remainingMs > 0) {
      const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const message = `Too many requests. Cooling down for ${retryAfterSeconds}s.`;
      const cooldownError = new Error(message);
      cooldownError.isRateLimited = true;
      cooldownError.isCooldownSkip = true;
      cooldownError.retryAfterSeconds = retryAfterSeconds;
      cooldownError.response = {
        status: 429,
        data: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds,
        },
      };
      return Promise.reject(cooldownError);
    }
    rateLimitedGetUntil.delete(key);
  }

  return config;
});

// Normalize 429 rate-limit responses and emit a non-blocking notification event
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(error.response);
      const serverMessage =
        typeof error.response.data === 'object' ? error.response.data?.message : '';
      const message =
        serverMessage || `Too many requests. Please wait ${retryAfterSeconds}s and try again.`;

      error.isRateLimited = true;
      error.retryAfterSeconds = retryAfterSeconds;
      error.message = message;
      error.response.data = {
        ...(typeof error.response.data === 'object' && error.response.data !== null
          ? error.response.data
          : {}),
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds,
      };

      const method = String(error.config?.method || 'get').toLowerCase();
      if (method === 'get') {
        const key = normalizeRateLimitKey(error.config);
        const cooldownMs = Math.min(retryAfterSeconds, 60) * 1000;
        rateLimitedGetUntil.set(key, Date.now() + cooldownMs);
      }

      if (typeof window !== 'undefined' && !error.isCooldownSkip) {
        const now = Date.now();
        if (now - lastToastDispatchedAt > 2000) {
          lastToastDispatchedAt = now;
          window.dispatchEvent(
            new CustomEvent('apiRateLimited', {
              detail: {
                message,
                retryAfterSeconds,
                url: error.config?.url || '',
              },
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (name, email, phone, password, confirmPassword) =>
    api.post('/auth/register', { name, email, phone, password, confirmPassword }),
  registerDelivery: (data) =>
    api.post('/auth/delivery/register', data),
  login: (email, password, portal = '') =>
    api.post('/auth/login', { email, password, portal }),
  verifyDelivery: (data) =>
    api.put('/auth/delivery/verify', data),
  updateDeliveryStatus: (data) =>
    api.put('/auth/delivery/status', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Saved Delivery Addresses (User DB Collection)
export const userAddressesAPI = {
  getAll: () => api.get('/users/addresses'),
  save: (data) => api.post('/users/addresses', data),
  update: (addressId, data) => api.put(`/users/addresses/${addressId}`, data),
  remove: (addressId) => api.delete(`/users/addresses/${addressId}`),
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
  createRazorpayOrder: (deliveryTip = 0, shippingAddress = null) =>
    api.post('/orders/razorpay/create-order', { deliveryTip, shippingAddress }),
  verifyRazorpayPayment: (paymentData) =>
    api.post('/orders/razorpay/verify-payment', paymentData),
};

// Admin Orders APIs
export const adminOrdersAPI = {
  getAll: () => api.get('/orders/admin/all'),
  updateStatus: (id, status, deliveryPartner) =>
    api.put(`/orders/${id}/status`, { status, deliveryPartner }),
  rerouteOrder: (id, riderId = null) =>
    api.post(`/orders/${id}/reroute`, riderId ? { riderId } : {}),
};

// Delivery Partner APIs
export const deliveryAPI = {
  getActiveOrders: () => api.get('/orders/delivery/active'),
  updateOrderStatus: (id, status, partnerInfo = {}) =>
    api.put(`/orders/delivery/${id}/status`, { status, ...partnerInfo }),
  declineOrder: (id) =>
    api.put(`/orders/delivery/${id}/decline`),
};

// Admin Users APIs
export const adminUsersAPI = {
  getCount: () => api.get('/users/admin/count'),
  getAll: () => api.get('/users/admin'),
  getRiders: () => api.get('/users/admin/riders'),
  createRider: (data) => api.post('/users/admin/riders', data),
  updateRiderStatus: (id, verificationStatus) =>
    api.patch(`/users/admin/riders/${id}/status`, { verificationStatus }),
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