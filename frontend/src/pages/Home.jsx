import React, { useEffect, useState, useRef } from 'react';
import { categoriesAPI, productsAPI } from '../api/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Home.css';



const promoData = [
  {
    id: 1,
    title: 'Pharmacy at your doorstep!',
    subtitle: 'Cough syrups, pain relief sprays & more',
    cta: 'Order Now',
    bg: '#18b8b3',
    search: 'pharmacy',
    categoryName: 'Pharma & Wellness',
  },
  {
    id: 2,
    title: 'Pet care supplies at your door',
    subtitle: 'Food, treats, toys & more',
    cta: 'Order Now',
    bg: '#f2cf35',
    search: 'pet',
    categoryName: 'Pet Care',
  },
  {
    id: 3,
    title: 'No time for a diaper run?',
    subtitle: 'Get baby care essentials',
    cta: 'Order Now',
    bg: '#dfe6ef',
    search: 'baby',
    categoryName: 'Baby Care',
  },
];

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [homeSections, setHomeSections] = useState([]);
  const sliderRefs = useRef([]);
  const scrollTimerRef = useRef(null);
  const firstScrollStarted = useRef(false);
  const { addToCart, getProductQuantity, updateCartItem, removeFromCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
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

  useEffect(() => {
    const handleScrollStart = () => {
      if (user || firstScrollStarted.current) return;
      firstScrollStarted.current = true;
      scrollTimerRef.current = setTimeout(() => {
        setShowLoginModal(true);
      }, 4000);
    };

    if (!user) {
      window.addEventListener('scroll', handleScrollStart, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScrollStart);
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
      firstScrollStarted.current = false;
    };
  }, [user]);

  const fetchData = async () => {
    try {
      const catRes = await categoriesAPI.getAll();
      setCategories(catRes.data);

      // Build home sections based on categories flagged for home
      const flagged = catRes.data.filter((c) => c.showOnHome);
      const sectionsWithProducts = await Promise.all(
        flagged.map(async (cat) => {
          try {
            const res = await productsAPI.getAll(cat._id);
            return {
              category: cat,
              products: res.data,
            };
          } catch (err) {
            console.error('Error fetching products for category', cat._id, err);
            return { category: cat, products: [] };
          }
        })
      );
      setHomeSections(sectionsWithProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getPromoLink = (promo) => {
    const category = categories.find((cat) => cat.name === promo.categoryName);
    if (category?._id) {
      return `/products?category=${category._id}`;
    }
    return `/products?search=${encodeURIComponent(promo.search)}`;
  };

  const handleAddToCart = async (productId) => {
    if (!user) {
      setPendingProductId(productId);
      setShowLoginModal(true);
      return;
    }
    await addToCart(productId, 1);
  };

  const handleIncrement = async (productId) => {
    await addToCart(productId, 1);
  };

  const handleDecrement = async (productId) => {
    const qty = getProductQuantity(productId);
    if (qty > 1) {
      await updateCartItem(productId, qty - 1);
    } else if (qty === 1) {
      await removeFromCart(productId);
    }
  };

  const closeLoginModal = () => {
    if (loginLoading) return;
    setShowLoginModal(false);
    setPendingProductId(null);
    setLoginError('');
    clearTimeout(scrollTimerRef.current);
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
      clearTimeout(scrollTimerRef.current);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const scrollSection = (index, direction = 1) => {
    const el = sliderRefs.current[index];
    if (el) {
      el.scrollBy({ left: direction * 260, behavior: 'smooth' });
    }
  };

  return (
    <>
    <div className={`home ${showLoginModal ? 'home-blur' : ''}`}>
      <div className="hero">
        <h1>🚀 Quick Cart</h1>
        <p>20 minute delivery - Fresh products at your doorstep</p>
      </div>

      <div className="promo-strip">
        {promoData.map((promo) => (
          <div
            key={promo.id}
            className="promo-card"
            style={{ backgroundColor: promo.bg }}
          >
            <div className="promo-content">
              <h3 className="promo-title">{promo.title}</h3>
              <p className="promo-subtitle">{promo.subtitle}</p>
              <Link
                to={getPromoLink(promo)}
                className="promo-btn"
              >
                {promo.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="section">
        <h2>Categories</h2>
        <div className="categories-grid">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/products?category=${cat._id}`}
              className="category-card"
            >
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="category-image" />
              ) : (
                <div className="category-icon">{cat.icon || '📦'}</div>
              )}
              <p>{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin-configured category sections */}
      {homeSections.map(({ category, products }, idx) => (
        <div className="section home-section" key={category._id}>
          <div className="section-header">
            <h2>{category.homeTitle || category.name}</h2>
            <Link to={`/products?category=${category._id}`} className="see-all-link">See all</Link>
          </div>
          {products.length === 0 ? (
            <p className="loading">No products yet.</p>
          ) : (
            <div className="product-slider">
              <div
                className="product-scroll"
                ref={(el) => { sliderRefs.current[idx] = el; }}
              >
              {products.map((product, index) => {
                const qty = getProductQuantity(product._id);
                return (
                <div key={product._id || index} className="product-card">
                  <Link
                    to={`/products/${product._id}`}
                    className="product-color-box"
                    style={{ backgroundColor: '#f8fafc' }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="product-color-initial">
                        {product.name?.charAt(0)?.toUpperCase() || 'P'}
                      </span>
                    )}
                  </Link>
                  <div className="product-info">
                    <div className="product-header">
                      <h3>{product.name}</h3>
                      <button
                        className={`wishlist-btn ${isInWishlist(product._id) ? 'wishlisted' : ''}`}
                        onClick={() => {
                          if (isInWishlist(product._id)) {
                            removeFromWishlist(product._id);
                          } else {
                            addToWishlist(product);
                          }
                        }}
                        title={isInWishlist(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        {isInWishlist(product._id) ? '❤️' : '🤍'}
                      </button>
                    </div>
                    <p className="unit">{product.unit}</p>
                    <p className="price">₹{product.price}</p>
                    <p className="delivery">⏱️ {product.deliveryTime || '10'} min</p>
                    {product.stock === 0 ? (
                      <p className="stock-out">Out of Stock</p>
                    ) : qty > 0 ? (
                      <div className="card-actions card-actions-stack">
                        <div className="qty-controls pill-controls">
                          <button
                            className="qty-btn qty-btn-light"
                            onClick={() => handleDecrement(product._id)}
                          >
                            −
                          </button>
                          <span className="qty-value">{qty}</span>
                          <button
                            className="qty-btn qty-btn-light"
                            onClick={() => handleIncrement(product._id)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product._id)}
                        className="add-btn add-btn-compact add-btn-green pill-add"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );})}
              </div>
              {products.length > 5 && (
                <button
                  type="button"
                  aria-label="Scroll right"
                  className="slider-btn slider-btn-right"
                  onClick={() => scrollSection(idx, 1)}
                >
                  ›
                </button>
              )}
            </div>
          )}
        </div>
      ))}

    </div>
    

    {showLoginModal && (
      <div className="login-modal-backdrop" role="dialog" aria-modal="true">
        <div className="login-modal">
          <button className="modal-close" onClick={closeLoginModal} aria-label="Close login form">
            ×
          </button>
          <div className="login-modal-header">
            <div className="login-badge">🔒 Secure checkout</div>
            <h2>Welcome back</h2>
            <p>Sign in to keep shopping seamlessly.</p>
          </div>
          {loginError && <div className="error-msg">{loginError}</div>}
          <form onSubmit={handleLoginSubmit} className="login-modal-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Logging in…' : 'Login & continue'}
            </button>
          </form>
          <p className="auth-link">
            Don't have an account?{' '}
            <span
              className="auth-link-inline"
              onClick={() => {
                closeLoginModal();
                navigate('/register');
              }}
            >
              Register here
            </span>
          </p>
        </div>
      </div>
    )}
  </>
  );
};

export default Home;