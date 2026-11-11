const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { JWT_SECRET } = require('./auth');

const MINUTE_MS = 60 * 1000;

/**
 * Parses a positive integer environment override, falling back when unset or invalid.
 */
const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) => {
  const raw = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '127.0.0.1';
};

/**
 * Extracts and verifies the authenticated user id from request state or Bearer JWT.
 * Unverified or expired tokens return null so callers cannot spoof isolated user buckets.
 */
const getVerifiedUserId = (req) => {
  if (req.userId) {
    return String(req.userId);
  }
  if (req._rateLimitUidResolved) {
    return req._rateLimitUid;
  }

  req._rateLimitUidResolved = true;
  req._rateLimitUid = null;

  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.userId) {
      req._rateLimitUid = String(decoded.userId);
    }
  } catch {
    req._rateLimitUid = null;
  }

  return req._rateLimitUid;
};

const getIpKey = (req) => `ip:${ipKeyGenerator(getClientIp(req))}`;

const getUserOrIpKey = (req) => {
  const userId = getVerifiedUserId(req);
  return userId ? `uid:${userId}` : getIpKey(req);
};

const getLoginAccountKey = (req) => {
  const email = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';
  return `login:${ipKeyGenerator(getClientIp(req))}:${email || 'unknown'}`;
};

const computeRetryAfterSeconds = (req, fallbackWindowMs) => {
  const resetTime = req.rateLimit?.resetTime;
  if (resetTime instanceof Date) {
    const deltaMs = resetTime.getTime() - Date.now();
    if (deltaMs > 0) {
      return Math.max(1, Math.ceil(deltaMs / 1000));
    }
  }
  return Math.max(1, Math.ceil(fallbackWindowMs / 1000));
};

/**
 * Builds an express-rate-limit middleware with consistent Draft-8 headers and JSON 429 payload.
 */
const createLimiter = ({
  name,
  windowMs,
  limit,
  keyGenerator = getUserOrIpKey,
  skip,
  skipSuccessfulRequests = false,
  message = 'Too many requests.',
}) =>
  rateLimit({
    identifier: name,
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: true,
    keyGenerator,
    skip,
    skipSuccessfulRequests,
    handler: (req, res) => {
      const retryAfterSeconds = computeRetryAfterSeconds(req, windowMs);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        message: `${message} Please try again in ${retryAfterSeconds}s.`,
        code: 'RATE_LIMIT_EXCEEDED',
        limiter: name,
        retryAfterSeconds,
      });
    },
  });

const globalWindowMs = parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 15 * MINUTE_MS);
const globalAuthMax = parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_AUTH_MAX, 1200);
const globalAnonMax = parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_ANON_MAX, 300);

const SKIP_GLOBAL_PREFIXES = ['/uploads', '/category-images'];
const SKIP_GLOBAL_EXACT = new Set(['/', '/api', '/health', '/api/health']);

/** Global DoS protection baseline with higher allowance for authenticated polling users. */
const globalApiLimiter = createLimiter({
  name: 'global',
  windowMs: globalWindowMs,
  limit: (req) => (getVerifiedUserId(req) ? globalAuthMax : globalAnonMax),
  keyGenerator: getUserOrIpKey,
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    const reqPath = (req.originalUrl || req.url || '').split('?')[0];
    if (SKIP_GLOBAL_EXACT.has(reqPath)) return true;
    if (SKIP_GLOBAL_PREFIXES.some((prefix) => reqPath.startsWith(prefix))) return true;
    if (reqPath === '/orders/razorpay/webhook' || reqPath === '/api/orders/razorpay/webhook') {
      return true;
    }
    return false;
  },
  message: 'Too many requests from this session or network.',
});

/** Prevents credential stuffing per IP + account email; ignores successful logins. */
const authLoginLimiter = createLimiter({
  name: 'auth_login',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_LOGIN_MAX, 15),
  keyGenerator: getLoginAccountKey,
  skipSuccessfulRequests: true,
  message: 'Too many failed login attempts for this account.',
});

/** Caps total login attempts per IP across different email addresses. */
const authIpBurstLimiter = createLimiter({
  name: 'auth_login_ip',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_LOGIN_IP_MAX, 40),
  keyGenerator: getIpKey,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts from your IP address.',
});

/** Limits customer and delivery partner registration spam per IP. */
const authRegisterLimiter = createLimiter({
  name: 'auth_register',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, 60 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_REGISTER_MAX, 10),
  keyGenerator: getIpKey,
  message: 'Too many registration attempts from your IP address.',
});

/** Limits profile, address, and rider KYC/availability mutations per authenticated user. */
const profileMutationLimiter = createLimiter({
  name: 'profile_mutation',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_PROFILE_WINDOW_MS, 15 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_PROFILE_MAX, 60),
  message: 'Too many profile or address updates.',
});

/** Limits catalog browsing and search reads to prevent automated scraping. */
const catalogReadLimiter = createLimiter({
  name: 'catalog_read',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_CATALOG_WINDOW_MS, MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_CATALOG_MAX, 120),
  message: 'You are browsing too quickly.',
});

/** Protects external reverse-geocoding upstreams (Photon / Nominatim) from abuse. */
const locationReverseLimiter = createLimiter({
  name: 'location_reverse',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_LOCATION_WINDOW_MS, MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_LOCATION_MAX, 25),
  message: 'Too many location lookups.',
});

/** Limits static default location reads. */
const locationCurrentLimiter = createLimiter({
  name: 'location_current',
  windowMs: MINUTE_MS,
  limit: parsePositiveInt(process.env.RATE_LIMIT_LOCATION_CURRENT_MAX, 120),
  message: 'Too many location requests.',
});

/** Limits cart fetch requests per authenticated user. */
const cartReadLimiter = createLimiter({
  name: 'cart_read',
  windowMs: MINUTE_MS,
  limit: parsePositiveInt(process.env.RATE_LIMIT_CART_READ_MAX, 120),
  message: 'Too many cart sync requests.',
});

/** Limits cart modifications (add, update, remove, clear) per authenticated user. */
const cartWriteLimiter = createLimiter({
  name: 'cart_write',
  windowMs: MINUTE_MS,
  limit: parsePositiveInt(process.env.RATE_LIMIT_CART_WRITE_MAX, 60),
  message: 'Too many cart updates.',
});

/** Protects order placement and Razorpay create/verify financial flows. */
const orderCheckoutLimiter = createLimiter({
  name: 'order_checkout',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_CHECKOUT_WINDOW_MS, 10 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_CHECKOUT_MAX, 25),
  message: 'Too many checkout or payment requests.',
});

/** Dedicated burst-tolerant limiter for Razorpay server-to-server webhooks. */
const webhookLimiter = createLimiter({
  name: 'razorpay_webhook',
  windowMs: MINUTE_MS,
  limit: parsePositiveInt(process.env.RATE_LIMIT_WEBHOOK_MAX, 300),
  keyGenerator: getIpKey,
  message: 'Webhook rate limit exceeded.',
});

/** Supports legitimate 3s-12s dashboard/order polling while blocking runaway loops. */
const pollingReadLimiter = createLimiter({
  name: 'polling_read',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_POLLING_WINDOW_MS, MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_POLLING_MAX, 90),
  message: 'Too many status refresh requests.',
});

/** Limits delivery partner accept, status transition, and decline actions. */
const deliveryActionLimiter = createLimiter({
  name: 'delivery_action',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_DELIVERY_WINDOW_MS, 5 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_DELIVERY_MAX, 45),
  message: 'Too many delivery status updates.',
});

/** Limits admin catalog uploads, order status overrides, rerouting, and fleet onboarding. */
const adminWriteLimiter = createLimiter({
  name: 'admin_write',
  windowMs: parsePositiveInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS, 5 * MINUTE_MS),
  limit: parsePositiveInt(process.env.RATE_LIMIT_ADMIN_MAX, 80),
  message: 'Too many administrative write requests.',
});

module.exports = {
  globalApiLimiter,
  authLoginLimiter,
  authIpBurstLimiter,
  authRegisterLimiter,
  profileMutationLimiter,
  catalogReadLimiter,
  locationReverseLimiter,
  locationCurrentLimiter,
  cartReadLimiter,
  cartWriteLimiter,
  orderCheckoutLimiter,
  webhookLimiter,
  pollingReadLimiter,
  deliveryActionLimiter,
  adminWriteLimiter,
  getVerifiedUserId,
};
