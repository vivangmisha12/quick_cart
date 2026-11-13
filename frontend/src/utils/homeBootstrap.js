import { Capacitor } from '@capacitor/core';
import { categoriesAPI, bannersAPI, productsAPI } from '../api/api';

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'https://quick-cart-qnz6.onrender.com/api'
).replace(/\/api\/?$/, '');

const STORAGE_KEY = 'progicart_home_bootstrap_v1';

export const DEFAULT_HERO_BANNERS = [
  {
    _id: 'default-hero-dairy',
    isFallback: true,
    badge: 'INSTANT 10 MINS DELIVERY',
    title: 'Fresh Dairy Products',
    subtitle: 'Milk, Curd, Butter, Paneer & more',
    cta: 'Shop Now',
    link: '/products?search=Milk',
    image: '/category-images/dairy-bread-eggs.jpg',
    bg: 'linear-gradient(125deg, #F4FBF5 0%, #E7F7EB 52%, #CDEFD5 100%)',
  },
  {
    _id: 'default-hero-produce',
    isFallback: true,
    badge: 'FRESH DAILY HARVEST',
    title: 'Farm-Fresh Fruits & Veggies',
    subtitle: 'Crisp seasonal produce delivered in 10 minutes',
    cta: 'Explore Fresh',
    link: '/products?search=Fruits',
    image: '/category-images/fruits-vegetables.jpg',
    bg: 'linear-gradient(125deg, #F5FBF4 0%, #E4F5E6 55%, #C6EBD0 100%)',
  },
  {
    _id: 'default-hero-snacks',
    isFallback: true,
    badge: 'TOP DEALS TODAY',
    title: 'Snacks & Cool Beverages',
    subtitle: 'Chips, namkeen, juices & cold drinks anytime',
    cta: 'Order Now',
    link: '/products?search=Snacks',
    image: '/category-images/snacks-munchies.jpg',
    bg: 'linear-gradient(125deg, #F7FBF6 0%, #EAF8ED 55%, #D5F1DC 100%)',
  },
];

export const DEFAULT_PROMO_BANNERS = [
  {
    _id: 'default-promo-baby',
    isFallback: true,
    title: 'Baby Care Essentials',
    subtitle: 'Diapers, Wipes, Lotions & more',
    cta: 'Order Now',
    link: '/products?search=Baby',
    image: '/category-images/baby-care.jpg',
    bg: 'linear-gradient(135deg, #F4F8FB 0%, #EBF3FA 100%)',
  },
  {
    _id: 'default-promo-pet',
    isFallback: true,
    title: 'Pet Care Supplies',
    subtitle: 'Food, Treats, Toys & more',
    cta: 'Shop Now',
    link: '/products?search=Pet',
    image: '/category-images/pet-care.jpg',
    bg: 'linear-gradient(135deg, #FDF8EE 0%, #FBF0D9 100%)',
  },
];

export const STATIC_CATEGORY_IMAGES = [
  '/logo.png',
  '/category-images/fruits-vegetables.jpg',
  '/category-images/dairy-bread-eggs.jpg',
  '/category-images/snacks-munchies.jpg',
  '/category-images/cold-drinks-juices.jpg',
  '/category-images/bakery-biscuits.jpg',
  '/category-images/atta-rice-dal.jpg',
  '/category-images/masala-oil-more.jpg',
  '/category-images/breakfast-instant-food.jpg',
  '/category-images/tea-coffee-milk-drinks.jpg',
  '/category-images/sweet-tooth.jpg',
  '/category-images/cleaning-essentials.jpg',
  '/category-images/personal-care.jpg',
  '/category-images/baby-care.jpg',
  '/category-images/pet-care.jpg',
  '/category-images/pharma-wellness.jpg',
];

/**
 * Normalize asset paths across web dev, web prod, and Capacitor native APK.
 * Resolves `/uploads/...`, `uploads/...`, and stale localhost upload URLs to `API_ORIGIN`.
 */
export const resolveAssetUrl = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';

  const localUploadMatch = trimmed.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.+)$/i);
  if (localUploadMatch) {
    const isNative = Boolean(Capacitor?.isNativePlatform?.());
    const isNonLocalBrowser =
      typeof window !== 'undefined' &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isNative || isNonLocalBrowser) {
      return `${API_ORIGIN}${localUploadMatch[1]}`;
    }
    return trimmed;
  }

  if (/^(?:https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${API_ORIGIN}${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `${API_ORIGIN}/${trimmed}`;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

// Retain decoded Image objects in memory so banners & sub-banners appear without flicker
const retainedImages = new Map();
const MAX_RETAINED_IMAGES = 250;

export const preloadImage = (src, timeoutMs = 4500) => {
  const url = resolveAssetUrl(src);
  if (!url) return Promise.resolve();

  const existing = retainedImages.get(url);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    const img = new Image();

    const retainLoaded = () => {
      if (retainedImages.size >= MAX_RETAINED_IMAGES) {
        const firstKey = retainedImages.keys().next().value;
        if (firstKey) retainedImages.delete(firstKey);
      }
      retainedImages.set(url, img);
    };

    img.onload = () => {
      retainLoaded();
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {}).finally(finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = url;

    if (img.complete && img.naturalWidth > 0) {
      retainLoaded();
      finish();
    }
  });
};

const readPersistedBootstrap = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.activeBanners)) {
      return {
        categories: parsed.categories,
        activeBanners: parsed.activeBanners,
        homeSections: Array.isArray(parsed.homeSections) ? parsed.homeSections : [],
        loadedAt: parsed.loadedAt || 0,
        fromStorage: true,
      };
    }
  } catch {
    // Ignore corrupt local cache
  }
  return null;
};

const persistBootstrap = (snapshot) => {
  if (typeof window === 'undefined' || !window.localStorage || !snapshot) return;
  try {
    const compact = {
      categories: snapshot.categories || [],
      activeBanners: snapshot.activeBanners || [],
      homeSections: (snapshot.homeSections || []).map((s) => ({
        category: s.category,
        products: Array.isArray(s.products) ? s.products.slice(0, 12) : [],
      })),
      loadedAt: snapshot.loadedAt || Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // Ignore storage quota issues
  }
};

let cachedBootstrap = readPersistedBootstrap();
let freshLoadedThisSession = false;
let inflightBootstrap = null;

export const getCachedHomeBootstrap = () => cachedBootstrap;

const collectUrls = (items) => {
  const urls = new Set();
  items.forEach((raw) => {
    const resolved = resolveAssetUrl(raw);
    if (resolved) urls.add(resolved);
  });
  return Array.from(urls);
};

const emitBootstrapReady = (snapshot) => {
  if (typeof window !== 'undefined' && snapshot) {
    window.dispatchEvent(new CustomEvent('progicart:bootstrap-ready', { detail: snapshot }));
  }
};

/**
 * Fetch and cache Home categories, hero/promo banners, and home product shelves once,
 * prioritizing preloading of all banners & category sub-banners during SplashScreen.
 */
export const bootstrapHomeData = async ({ force = false, onProgress } = {}) => {
  if (!force && freshLoadedThisSession && cachedBootstrap) {
    onProgress?.(100);
    return cachedBootstrap;
  }

  if (inflightBootstrap) {
    return inflightBootstrap;
  }

  const run = async () => {
    onProgress?.(25);

    const [catResult, banResult] = await Promise.allSettled([
      categoriesAPI.getAll(),
      bannersAPI.getActive(),
    ]);

    const hasFreshCategories =
      catResult.status === 'fulfilled' && Array.isArray(catResult.value?.data);
    const hasFreshBanners =
      banResult.status === 'fulfilled' && Array.isArray(banResult.value?.data);

    const categories = hasFreshCategories
      ? catResult.value.data
      : cachedBootstrap?.categories || [];

    const activeBanners = hasFreshBanners
      ? banResult.value.data
      : cachedBootstrap?.activeBanners || [];

    // Priority Tier 1: All Hero, Promo & Category Sub-banners (+ fallbacks)
    const bannerPriorityRaw = [
      '/logo.png',
      ...activeBanners.map((b) => b?.image),
      ...categories.map((c) => c?.homeBannerImage),
      ...DEFAULT_HERO_BANNERS.map((b) => b.image),
      ...DEFAULT_PROMO_BANNERS.map((b) => b.image),
    ];
    const bannerUrls = collectUrls(bannerPriorityRaw);

    onProgress?.(45);

    // Start preloading ALL banner & sub-banner images right away while product shelves load
    const bannerPreloadPromise = Promise.all(
      bannerUrls.map((url) => preloadImage(url, 4500))
    );

    const flaggedCategories = categories.filter((c) => c.showOnHome);
    const existingSectionsById = new Map(
      (cachedBootstrap?.homeSections || []).map((s) => [s?.category?._id, s])
    );

    // Emit Phase-1 snapshot as soon as banners & categories arrive so UI never stalls on skeletons
    const phase1Snapshot = {
      categories,
      activeBanners,
      homeSections:
        flaggedCategories.length > 0
          ? flaggedCategories.map((cat) => ({
              category: cat,
              products: existingSectionsById.get(cat._id)?.products || [],
            }))
          : cachedBootstrap?.homeSections || [],
      loadedAt: Date.now(),
    };
    if (hasFreshCategories || hasFreshBanners) {
      cachedBootstrap = phase1Snapshot;
      emitBootstrapReady(phase1Snapshot);
    }

    const sectionsPromise = Promise.all(
      flaggedCategories.map(async (cat) => {
        try {
          const res = await productsAPI.getAll(cat._id);
          return {
            category: cat,
            products: Array.isArray(res?.data) ? res.data : [],
          };
        } catch {
          return {
            category: cat,
            products: existingSectionsById.get(cat._id)?.products || [],
          };
        }
      })
    );

    const [homeSections] = await Promise.all([sectionsPromise, bannerPreloadPromise]);

    onProgress?.(80);

    const snapshot = {
      categories,
      activeBanners,
      homeSections,
      loadedAt: Date.now(),
    };
    cachedBootstrap = snapshot;
    if (hasFreshCategories || hasFreshBanners) {
      freshLoadedThisSession = true;
      persistBootstrap(snapshot);
    }

    emitBootstrapReady(snapshot);

    // Tier 2: Warm category thumbnails, subcategory thumbnails, visible product thumbs & local fallbacks
    const tier2Raw = [...STATIC_CATEGORY_IMAGES];
    categories.forEach((c) => {
      if (c?.image) tier2Raw.push(c.image);
      (c?.subcategories || []).forEach((sub) => {
        if (sub?.image) tier2Raw.push(sub.image);
      });
    });
    homeSections.forEach(({ products }) => {
      (products || []).slice(0, 6).forEach((p) => {
        const img = p?.images?.[0] || p?.image;
        if (img) tier2Raw.push(img);
      });
    });

    const tier2Urls = collectUrls(tier2Raw).filter((u) => !bannerUrls.includes(u));
    if (tier2Urls.length > 0) {
      let settledCount = 0;
      const tier2All = Promise.all(
        tier2Urls.map((url) =>
          preloadImage(url, 2500).then(() => {
            settledCount += 1;
            const pct = Math.min(95, 80 + Math.round((settledCount / tier2Urls.length) * 15));
            onProgress?.(pct);
          })
        )
      );
      await Promise.race([
        tier2All,
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);
    }

    onProgress?.(100);
    return snapshot;
  };

  inflightBootstrap = run().finally(() => {
    inflightBootstrap = null;
  });

  return inflightBootstrap;
};
