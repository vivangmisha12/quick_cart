import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
  Clock,
  ArrowRight,
  Lock,
  X
} from 'lucide-react';
import {
  DEFAULT_HERO_BANNERS,
  DEFAULT_PROMO_BANNERS,
  resolveAssetUrl,
  getCachedHomeBootstrap,
  bootstrapHomeData,
} from '../utils/homeBootstrap';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import LazyImage from '../components/LazyImage';
import '../styles/Home.css';

const Home = () => {
  const initialCache = getCachedHomeBootstrap();
  const [categories, setCategories] = useState(() => initialCache?.categories || []);
  const [homeSections, setHomeSections] = useState(() => initialCache?.homeSections || []);
  const [activeBanners, setActiveBanners] = useState(() => initialCache?.activeBanners || []);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(() => !initialCache);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || document.body.classList.contains('capacitor-native-app');
  });

  const [shelfScrollState, setShelfScrollState] = useState({});
  const sliderRefs = useRef([]);
  const heroTouchStartX = useRef(null);

  const navigate = useNavigate();

  const isDarkBg = (bg) => {
    if (!bg || typeof bg !== 'string') return false;
    const hexMatch = bg.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) return false;
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 145;
  };

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(
        window.matchMedia('(max-width: 768px)').matches || document.body.classList.contains('capacitor-native-app')
      );
    };
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    const applySnapshot = (snapshot) => {
      if (!snapshot) return;
      setCategories(snapshot.categories || []);
      setActiveBanners(snapshot.activeBanners || []);
      setHomeSections(snapshot.homeSections || []);
      setLoading(false);
    };

    const existingCache = getCachedHomeBootstrap();
    if (existingCache) {
      applySnapshot(existingCache);
    }
    fetchData(false);

    const handleBootstrapReady = (event) => {
      applySnapshot(event.detail);
    };
    const handleRefresh = () => {
      fetchData(true);
    };

    window.addEventListener('progicart:bootstrap-ready', handleBootstrapReady);
    window.addEventListener('progicart:refresh', handleRefresh);
    return () => {
      window.removeEventListener('progicart:bootstrap-ready', handleBootstrapReady);
      window.removeEventListener('progicart:refresh', handleRefresh);
    };
  }, []);

  const backendHeroBanners = activeBanners.filter(b => b.type === 'hero');
  const backendPromoBanners = activeBanners.filter(b => b.type === 'promo');

  const heroBanners = !isMobileView
    ? backendHeroBanners
    : backendHeroBanners.length >= 2
      ? backendHeroBanners
      : backendHeroBanners.length === 1
        ? [backendHeroBanners[0], ...DEFAULT_HERO_BANNERS.slice(0, 2)]
        : DEFAULT_HERO_BANNERS;

  const promoBanners = !isMobileView
    ? backendPromoBanners
    : backendPromoBanners.length >= 2
      ? backendPromoBanners
      : backendPromoBanners.length === 1
        ? [backendPromoBanners[0], DEFAULT_PROMO_BANNERS[1]]
        : DEFAULT_PROMO_BANNERS;

  useEffect(() => {
    setCurrentHeroIndex((prev) => (prev >= heroBanners.length ? 0 : prev));
  }, [heroBanners.length]);

  useEffect(() => {
    if (heroBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroBanners.length);
      }, 4500);
      return () => clearInterval(timer);
    }
  }, [heroBanners.length]);

  const nextHero = () => {
    setCurrentHeroIndex((prev) => (prev + 1) % heroBanners.length);
  };

  const prevHero = () => {
    setCurrentHeroIndex((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1));
  };

  const handleHeroTouchStart = (e) => {
    heroTouchStartX.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleHeroTouchEnd = (e) => {
    if (heroTouchStartX.current === null || heroBanners.length <= 1) return;
    const endX = e.changedTouches?.[0]?.clientX ?? heroTouchStartX.current;
    const diff = heroTouchStartX.current - endX;
    heroTouchStartX.current = null;
    if (Math.abs(diff) > 36) {
      if (diff > 0) nextHero();
      else prevHero();
    }
  };

  const fetchData = async (silent = false) => {
    if (!silent && !getCachedHomeBootstrap()) {
      setLoading(true);
    }
    try {
      const snapshot = await bootstrapHomeData({ force: silent });
      if (snapshot) {
        setCategories(snapshot.categories || []);
        setActiveBanners(snapshot.activeBanners || []);
        setHomeSections(snapshot.homeSections || []);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('progicart:refresh-done'));
    }
  };

  const resolveImagePath = (rawPath) => resolveAssetUrl(rawPath);

  const getBannerImageUrl = (banner) => {
    if (!banner || !banner.image) return null;
    return resolveAssetUrl(banner.image);
  };

  const handleBannerImgError = (rawPath, e) => {
    const resolved = resolveAssetUrl(rawPath);
    if (resolved && !e.currentTarget.dataset.retried && e.currentTarget.src !== resolved) {
      e.currentTarget.dataset.retried = '1';
      e.currentTarget.src = resolved;
      return;
    }
    e.currentTarget.style.display = 'none';
  };

  const getCategoryImageUrl = (cat) => {
    if (cat?.image) {
      return resolveAssetUrl(cat.image);
    }
    const slug = cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `/category-images/${slug}.jpg`;
  };

  const updateShelfScrollState = (index) => {
    const el = sliderRefs.current[index];
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 6;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 6;
    setShelfScrollState((prev) => {
      const cur = prev[index];
      if (cur && cur.canScrollLeft === canScrollLeft && cur.canScrollRight === canScrollRight) {
        return prev;
      }
      return {
        ...prev,
        [index]: { canScrollLeft, canScrollRight },
      };
    });
  };

  useEffect(() => {
    const refreshAllShelves = () => {
      sliderRefs.current.forEach((el, idx) => {
        if (el) updateShelfScrollState(idx);
      });
    };
    const rafId = requestAnimationFrame(refreshAllShelves);
    window.addEventListener('resize', refreshAllShelves);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', refreshAllShelves);
    };
  }, [homeSections, isMobileView]);

  const scrollSection = (index, direction = 1) => {
    const el = sliderRefs.current[index];
    if (el) {
      el.scrollBy({ left: direction * 400, behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page-wrapper">
      {/* Hero Carousel Section */}
      <section className="hero-carousel-section">
        {loading ? (
          <div className="hero-skeleton-card" aria-hidden="true">
            <div className="hero-skeleton-shimmer skeleton-shimmer" />
            <div className="hero-skeleton-lines">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '132px', height: '18px', borderRadius: '999px' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '58%', height: '26px', borderRadius: '8px' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '44%', height: '14px', borderRadius: '6px' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '112px', height: '34px', borderRadius: '10px', marginTop: '6px' }} />
            </div>
          </div>
        ) : !isMobileView ? (
          heroBanners.length > 0 ? (() => {
            const activeHero = heroBanners[currentHeroIndex] || heroBanners[0];
            const desktopHeroImg = getBannerImageUrl(activeHero);

            return (
              <div
                className="hero-slider-card"
                style={{
                  background: activeHero.bg || '#168A32',
                  backgroundImage: desktopHeroImg ? `url("${desktopHeroImg}")` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {heroBanners.length > 1 && (
                  <button className="hero-nav-arrow arrow-left" onClick={prevHero} aria-label="Previous banner">
                    <ChevronLeft size={24} />
                  </button>
                )}

                <div className="hero-slider-content">
                  <div className="hero-speed-tag">
                    <Zap size={14} fill="#f8cb46" color="#f8cb46" />
                    <span>INSTANT 10 MINS DELIVERY</span>
                  </div>
                  <h1
                    className="hero-headline"
                    style={activeHero.textColor ? { color: activeHero.textColor } : undefined}
                    dangerouslySetInnerHTML={{ __html: activeHero.title }}
                  />
                  <p
                    className="hero-subline"
                    style={activeHero.textColor ? { color: activeHero.textColor } : undefined}
                  >
                    {activeHero.subtitle}
                  </p>
                  <div className="hero-cta-group">
                    <Link to={activeHero.link || '/products'} className="hero-shop-btn">
                      {activeHero.cta || 'Shop Now'} <ArrowRight size={16} />
                    </Link>
                    <div className="hero-delivery-badge">
                      <Clock size={16} color="#168A32" />
                      <span>Free delivery on ₹499+</span>
                    </div>
                  </div>
                </div>

                {heroBanners.length > 1 && (
                  <div className="hero-slider-dots">
                    {heroBanners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`slider-dot ${i === currentHeroIndex ? 'is-active' : ''}`}
                        onClick={() => setCurrentHeroIndex(i)}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {heroBanners.length > 1 && (
                  <button className="hero-nav-arrow arrow-right" onClick={nextHero} aria-label="Next banner">
                    <ChevronRight size={24} />
                  </button>
                )}
              </div>
            );
          })() : (
            <div className="hero-slider-card default-hero">
              <div className="hero-slider-content">
                <div className="hero-speed-tag">
                  <Zap size={14} fill="#f8cb46" color="#f8cb46" />
                  <span>INSTANT 10 MINS DELIVERY</span>
                </div>
                <h1 className="hero-headline">
                  Groceries & Essentials at Your Door in <span className="text-yellow">10 Minutes ⚡</span>
                </h1>
                <p className="hero-subline">
                  Farm-fresh fruits, dairy, snacks & household essentials delivered superfast.
                </p>
                <div className="hero-cta-group">
                  <Link to="/products" className="hero-shop-btn">
                    Shop Now <ArrowRight size={16} />
                  </Link>
                  <div className="hero-delivery-badge">
                    <ShieldCheck size={16} color="#168A32" />
                    <span>Best Quality Guaranteed</span>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (() => {
          const activeHero = heroBanners[currentHeroIndex] || DEFAULT_HERO_BANNERS[0];
          const heroImg = getBannerImageUrl(activeHero);
          const isFallbackHero = Boolean(activeHero?.isFallback);
          const heroTextColor =
            activeHero.textColor || (isFallbackHero ? '#171A18' : isDarkBg(activeHero.bg) ? '#FFFFFF' : '#171A18');

          return (
            <>
              <div
                className={`hero-slider-card ${isFallbackHero ? 'hero-slider-card-split' : 'hero-slider-card-backend'}`}
                onTouchStart={handleHeroTouchStart}
                onTouchEnd={handleHeroTouchEnd}
                onClick={() => navigate(activeHero.link || '/products')}
                style={{
                  background: activeHero.bg || '#EAF8ED',
                  cursor: 'pointer',
                }}
              >
                {!isFallbackHero && heroImg && (
                  <img
                    src={heroImg}
                    alt=""
                    className="hero-full-bg-img"
                    onError={(e) => handleBannerImgError(activeHero.image, e)}
                  />
                )}

                {heroBanners.length > 1 && (
                  <button
                    className="hero-nav-arrow arrow-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevHero();
                    }}
                    aria-label="Previous banner"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}

                <div className="hero-slider-content" style={{ color: heroTextColor }}>
                  <div className="hero-speed-tag">
                    <Zap size={13} fill="#f8cb46" color="#f8cb46" />
                    <span>{activeHero.badge || 'INSTANT DELIVERY'}</span>
                  </div>
                  <h1
                    className="hero-headline"
                    style={{ color: heroTextColor }}
                    dangerouslySetInnerHTML={{ __html: activeHero.title }}
                  />
                  <p className="hero-subline" style={{ color: heroTextColor }}>
                    {activeHero.subtitle}
                  </p>
                  <div className="hero-cta-group">
                    <Link
                      to={activeHero.link || '/products'}
                      className="hero-shop-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {activeHero.cta || 'Shop Now'} <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>

                {isFallbackHero && heroImg && (
                  <div className="hero-split-visual" aria-hidden="true">
                    <img src={heroImg} alt="" className="hero-split-img" />
                  </div>
                )}

                {heroBanners.length > 1 && (
                  <button
                    className="hero-nav-arrow arrow-right"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextHero();
                    }}
                    aria-label="Next banner"
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </div>

              {heroBanners.length > 1 && (
                <div className="hero-slider-dots" role="tablist" aria-label="Banner slides">
                  {heroBanners.map((banner, i) => (
                    <button
                      key={banner._id || i}
                      type="button"
                      role="tab"
                      aria-selected={i === currentHeroIndex}
                      className={`slider-dot ${i === currentHeroIndex ? 'is-active' : ''}`}
                      onClick={() => setCurrentHeroIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* Promo Banners Grid */}
      {loading && isMobileView ? (
        <section className="promo-cards-strip" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="promo-skeleton-card">
              <div className="promo-skeleton-bg skeleton-shimmer" />
              <div className="promo-skeleton-lines">
                <div className="skeleton-line skeleton-shimmer" style={{ width: '68%', height: '14px', borderRadius: '6px' }} />
                <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '10px', borderRadius: '5px' }} />
                <div className="skeleton-line skeleton-shimmer" style={{ width: '76px', height: '22px', borderRadius: '8px', marginTop: '4px' }} />
              </div>
            </div>
          ))}
        </section>
      ) : promoBanners.length > 0 && (
        <section className="promo-cards-strip">
          {promoBanners.map((promo) => {
            const promoImg = getBannerImageUrl(promo);
            const isFallbackPromo = Boolean(promo?.isFallback);

            if (!isMobileView) {
              return (
                <div
                  key={promo._id}
                  className="promo-feature-card"
                  onClick={() => navigate(promo.link || '/products')}
                  style={{
                    background: promo.bg || '#f4f6fb',
                    backgroundImage: promoImg ? `url("${promoImg}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div className="promo-feature-content">
                    <h3
                      className="promo-feature-title"
                      style={{ color: promo.textColor || '#1c1c1c' }}
                      dangerouslySetInnerHTML={{ __html: promo.title }}
                    />
                    <p
                      className="promo-feature-sub"
                      style={{ color: promo.textColor || '#555555' }}
                    >
                      {promo.subtitle}
                    </p>
                    <Link
                      to={promo.link || '/products'}
                      className="promo-feature-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {promo.cta || 'Order Now'}
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={promo._id}
                className={`promo-feature-card ${isFallbackPromo ? 'promo-feature-card-split' : ''}`}
                onClick={() => navigate(promo.link || '/products')}
                style={{
                  background: promo.bg || '#f4f8fb',
                  cursor: 'pointer',
                }}
              >
                {!isFallbackPromo && getBannerImageUrl(promo) && (
                  <img
                    src={getBannerImageUrl(promo)}
                    alt=""
                    className="promo-full-bg-img"
                    onError={(e) => handleBannerImgError(promo.image, e)}
                  />
                )}
                <div className="promo-feature-content">
                  <h3
                    className="promo-feature-title"
                    style={{ color: promo.textColor || '#171A18' }}
                    dangerouslySetInnerHTML={{ __html: promo.title }}
                  />
                  <p
                    className="promo-feature-sub"
                    style={{ color: promo.textColor || '#68716B' }}
                  >
                    {promo.subtitle}
                  </p>
                  <Link
                    to={promo.link || '/products'}
                    className="promo-feature-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>{promo.cta || 'Order Now'}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {isFallbackPromo && getBannerImageUrl(promo) && (
                  <div className="promo-split-visual" aria-hidden="true">
                    <img src={getBannerImageUrl(promo)} alt="" className="promo-split-img" />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Category Icons Grid */}
      <section className="categories-showcase-section">
        <div className="section-title-row">
          <div className="title-left">
            <h2>Explore Categories</h2>
            <span className="title-sub">Select a category to browse freshest picks</span>
          </div>
          <Link to="/products" className="see-all-action">
            All Categories <ChevronRight size={16} />
          </Link>
        </div>

        <div className="category-pills-grid">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="category-card-blinkit skeleton-card">
                <div className="category-card-img-wrap skeleton-shimmer" />
                <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '10px', margin: '8px auto 4px' }} />
              </div>
            ))
          ) : (
            categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products?category=${cat._id}`}
                className="category-card-blinkit"
              >
                <div className="category-card-img-wrap">
                  {cat.image || cat.name ? (
                    <LazyImage
                      src={getCategoryImageUrl(cat)}
                      alt={cat.name}
                      width={100}
                      height={100}
                      fallbackSrc={`/category-images/${cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`}
                    />
                  ) : (
                    <span className="cat-icon-fallback">{cat.icon || '📦'}</span>
                  )}
                </div>
                <span className="category-card-label" title={cat.name}>{cat.name}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Admin Curated Home Sections */}
      {loading ? (
        <section className="home-product-shelf" aria-hidden="true">
          <div className="section-title-row">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '170px', height: '22px', borderRadius: '8px' }} />
          </div>
          <div className="shelf-products-row">
            <ProductSkeleton count={6} />
          </div>
        </section>
      ) : (
        homeSections.map(({ category, products }, idx) => {
          const bannerUrl = resolveImagePath(category.homeBannerImage);
          const bannerPos = category.homeBannerPosition || 'top';
          const hasBanner = Boolean(bannerUrl) && bannerPos !== 'none';
          const hasSubcategories = (category.subcategories?.length || 0) > 0;
          const rawBannerLink = category.homeBannerLink || `/products?category=${category._id}`;
          const bannerLink =
            hasSubcategories &&
              rawBannerLink.includes('/products?') &&
              rawBannerLink.includes('category=') &&
              !rawBannerLink.includes('openSubcategories=')
              ? `${rawBannerLink}&openSubcategories=1`
              : rawBannerLink;
          const visibleProducts = isMobileView ? products.slice(0, 6) : products;

          return (
            <section className="home-product-shelf" key={category._id}>
              <div className="section-title-row">
                <div className="title-left">
                  <h2>{category.homeTitle || category.name}</h2>
                  <span className="title-sub">Freshly stocked in your neighborhood</span>
                </div>
                <Link to={`/products?category=${category._id}`} className="see-all-action">
                  See all <ChevronRight size={16} />
                </Link>
              </div>

              {hasBanner && bannerPos === 'top' && (
                <Link to={bannerLink} className="category-shelf-top-banner">
                  <img
                    src={bannerUrl}
                    alt={category.homeTitle || category.name}
                    className="category-shelf-top-img"
                    onError={(e) => handleBannerImgError(category.homeBannerImage, e)}
                  />
                </Link>
              )}

              <div className={hasBanner && bannerPos === 'left' ? 'category-shelf-left-layout' : 'category-shelf-stack-layout'}>
                {hasBanner && bannerPos === 'left' && (
                  <Link to={bannerLink} className="category-shelf-left-banner">
                    <img
                      src={bannerUrl}
                      alt={category.homeTitle || category.name}
                      className="category-shelf-left-img"
                      onError={(e) => handleBannerImgError(category.homeBannerImage, e)}
                    />
                  </Link>
                )}

                {products.length === 0 ? (
                  <div className="empty-shelf-notice">
                    <p>No products available right now in this category.</p>
                  </div>
                ) : (
                  <div className="shelf-slider-container">
                    {shelfScrollState[idx]?.canScrollLeft && (
                      <button
                        type="button"
                        className="shelf-nav-btn shelf-btn-left"
                        onClick={() => scrollSection(idx, -1)}
                        aria-label="Scroll left"
                      >
                        <ChevronLeft size={30} strokeWidth={2.5} />
                      </button>
                    )}

                    <div
                      className="shelf-products-row"
                      ref={(el) => { sliderRefs.current[idx] = el; }}
                      onScroll={() => updateShelfScrollState(idx)}
                    >
                      {visibleProducts.map((prod) => (
                        <ProductCard
                          key={prod._id}
                          product={prod}
                        />
                      ))}
                    </div>

                    {shelfScrollState[idx]?.canScrollRight && (
                      <button
                        type="button"
                        className="shelf-nav-btn shelf-btn-right"
                        onClick={() => scrollSection(idx, 1)}
                        aria-label="Scroll right"
                      >
                        <ChevronRight size={30} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isMobileView && products.length > 0 && (
                <Link
                  to={`/products?category=${category._id}`}
                  className="mobile-shelf-see-all-btn"
                >
                  <span>See all products</span>
                  <ChevronRight size={16} />
                </Link>
              )}
            </section>
          );
        })
      )}
    </div>
  );
};

export default Home;
