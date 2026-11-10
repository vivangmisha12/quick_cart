import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Lock,
  X
} from 'lucide-react';
import { categoriesAPI, productsAPI, bannersAPI } from '../api/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import LazyImage from '../components/LazyImage';
import '../styles/Home.css';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [homeSections, setHomeSections] = useState([]);
  const [activeBanners, setActiveBanners] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const sliderRefs = useRef([]);

  const { addToCart } = useCart();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const heroBanners = activeBanners.filter(b => b.type === 'hero');
  const promoBanners = activeBanners.filter(b => b.type === 'promo');

  useEffect(() => {
    if (heroBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroBanners.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [heroBanners.length]);

  const nextHero = () => {
    setCurrentHeroIndex((prev) => (prev + 1) % heroBanners.length);
  };

  const prevHero = () => {
    setCurrentHeroIndex((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, bannersRes] = await Promise.all([
        categoriesAPI.getAll(),
        bannersAPI.getActive()
      ]);
      setCategories(catRes.data || []);
      setActiveBanners(bannersRes.data || []);

      const flagged = (catRes.data || []).filter((c) => c.showOnHome);
      const sectionsWithProducts = await Promise.all(
        flagged.map(async (cat) => {
          try {
            const res = await productsAPI.getAll(cat._id);
            return {
              category: cat,
              products: res.data || [],
            };
          } catch (err) {
            return { category: cat, products: [] };
          }
        })
      );
      setHomeSections(sectionsWithProducts);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requireLoginHandler = (productId) => {
    if (!user) {
      setPendingProductId(productId);
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  const closeLoginModal = () => {
    if (loginLoading) return;
    setShowLoginModal(false);
    setPendingProductId(null);
    setLoginError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      await login(loginEmail, loginPassword);
      if (pendingProductId) {
        await addToCart(pendingProductId, 1);
      }
      setShowLoginModal(false);
      setPendingProductId(null);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const getBannerImageUrl = (banner) => {
    if (!banner || !banner.image) return null;
    const img = banner.image;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return img.startsWith('/') ? img : `/${img}`;
  };

  const getCategoryImageUrl = (cat) => {
    if (cat.image) {
      if (cat.image.startsWith('http://') || cat.image.startsWith('https://')) return cat.image;
      return cat.image.startsWith('/') ? cat.image : `/${cat.image}`;
    }
    const slug = cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `/category-images/${slug}.jpg`;
  };

  const scrollSection = (index, direction = 1) => {
    const el = sliderRefs.current[index];
    if (el) {
      el.scrollBy({ left: direction * 400, behavior: 'smooth' });
    }
  };

  return (
    <div className={`home-page-wrapper ${showLoginModal ? 'modal-blur-active' : ''}`}>
      {/* Hero Carousel Section */}
      <section className="hero-carousel-section">
        {heroBanners.length > 0 ? (
          <div 
            className="hero-slider-card"
            style={{ 
              background: heroBanners[currentHeroIndex].bg || '#0c831f',
              backgroundImage: getBannerImageUrl(heroBanners[currentHeroIndex])
                ? `url("${getBannerImageUrl(heroBanners[currentHeroIndex])}")`
                : 'none',
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
                dangerouslySetInnerHTML={{ __html: heroBanners[currentHeroIndex].title }}
              />
              <p className="hero-subline">{heroBanners[currentHeroIndex].subtitle}</p>
              <div className="hero-cta-group">
                <Link to={heroBanners[currentHeroIndex].link || '/products'} className="hero-shop-btn">
                  {heroBanners[currentHeroIndex].cta || 'Shop Now'} <ArrowRight size={16} />
                </Link>
                <div className="hero-delivery-badge">
                  <Clock size={16} color="#0c831f" />
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
        ) : (
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
                  <ShieldCheck size={16} color="#0c831f" />
                  <span>Best Quality Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Promo Banners Grid */}
      {promoBanners.length > 0 && (
        <section className="promo-cards-strip">
          {promoBanners.map((promo) => (
            <div 
              key={promo._id} 
              className="promo-feature-card"
              style={{ 
                background: promo.bg || '#f4f6fb',
                backgroundImage: getBannerImageUrl(promo)
                  ? `url("${getBannerImageUrl(promo)}")`
                  : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
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
                >
                  {promo.cta || 'Order Now'}
                </Link>
              </div>
            </div>
          ))}
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
        <section className="home-product-shelf">
          <div className="section-title-row">
            <h2>Popular Products</h2>
          </div>
          <div className="shelf-products-row">
            <ProductSkeleton count={6} />
          </div>
        </section>
      ) : (
        homeSections.map(({ category, products }, idx) => (
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

            {products.length === 0 ? (
              <div className="empty-shelf-notice">
                <p>No products available right now in this category.</p>
              </div>
            ) : (
              <div className="shelf-slider-container">
                <button
                  type="button"
                  className="shelf-nav-btn shelf-btn-left"
                  onClick={() => scrollSection(idx, -1)}
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={20} />
                </button>

                <div 
                  className="shelf-products-row"
                  ref={(el) => { sliderRefs.current[idx] = el; }}
                >
                  {products.map((prod) => (
                    <ProductCard 
                      key={prod._id}
                      product={prod}
                      onRequireLogin={requireLoginHandler}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="shelf-nav-btn shelf-btn-right"
                  onClick={() => scrollSection(idx, 1)}
                  aria-label="Scroll right"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </section>
        ))
      )}

      {/* Auth Modal Triggered on Action */}
      {showLoginModal && (
        <div className="login-modal-backdrop" role="dialog" aria-modal="true">
          <div className="login-modal-card">
            <button className="login-modal-close" onClick={closeLoginModal} aria-label="Close">
              <X size={20} />
            </button>
            <div className="login-modal-top">
              <div className="login-secure-chip">
                <Lock size={12} />
                <span>100% Secure Checkout</span>
              </div>
              <h3>Welcome to Progicart</h3>
              <p>Sign in to add items to your cart & get lightning delivery.</p>
            </div>

            {loginError && <div className="login-err-banner">{loginError}</div>}

            <form onSubmit={handleLoginSubmit} className="login-form-box">
              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="login-submit-btn" disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Login & Continue'}
              </button>
            </form>

            <div className="login-bottom-link">
              <span>Don't have an account?</span>
              <button 
                type="button"
                className="link-btn"
                onClick={() => {
                  closeLoginModal();
                  navigate('/register');
                }}
              >
                Register here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
