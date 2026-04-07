import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/Products.css';

const productBoxColors = [
  '#FFF8E6', '#EEF6FC', '#EEF9F2', '#FDF3E2', '#F3ECFA',
  '#FCEEF4', '#FDF4E8', '#ECF8F1', '#EBF4FC', '#FDEDEE'
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(() => searchParams.get('subcategory') || '');
  const [expandedCategory, setExpandedCategory] = useState(() => searchParams.get('category') || '');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const { addToCart, getProductQuantity, updateCartItem, removeFromCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const catId = searchParams.get('category') || '';
    const subCatId = searchParams.get('subcategory') || '';
    const searchText = searchParams.get('search') || '';
    setSelectedCategory(catId);
    setSelectedSubcategory(subCatId);
    setSearch(searchText);
    if (catId) setExpandedCategory(catId);
    fetchCategories();
  }, [searchParams]);

  useEffect(() => {
    fetchProducts(selectedCategory, selectedSubcategory, search);
  }, [search, selectedCategory, selectedSubcategory]);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchProducts = async (catId = '', subCatId = '', searchTerm = '') => {
    setLoading(true);
    try {
      // Build query params
      let queryString = '';
      if (catId) queryString += `?categoryId=${catId}`;
      if (subCatId) queryString += (queryString ? '&' : '?') + `subcategoryId=${subCatId}`;
      if (searchTerm) queryString += (queryString ? '&' : '?') + `search=${searchTerm}`;
      
      const res = await productsAPI.getAll(catId, searchTerm, subCatId);
      setProducts(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  const getBoxColor = (index) => productBoxColors[index % productBoxColors.length];

  const scrollProducts = (direction = 1) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 260, behavior: 'smooth' });
    }
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
      const response = await login(loginEmail, loginPassword);
      const next = response?.user?.isAdmin ? '/admin' : location.pathname + location.search;

      if (response?.user?.isAdmin) {
        navigate(next, { replace: true });
        return;
      }

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

  return (
    <>
      <div className={`products-page ${showLoginModal ? 'products-page-blur' : ''}`}>
        {/* Mobile Sidebar Toggle */}
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle categories"
        >
          ☰
        </button>

        {/* Category Sidebar */}
        <aside className={`categories-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>{selectedCategory ? 'Subcategories' : 'Categories'}</h3>
            <button 
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
          
          <div className="categories-list">
            {/* Show Main Categories OR Subcategories based on selection */}
            {selectedCategory === '' ? (
              // LEVEL 1: Show all main categories (Home page view)
              <>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    className={`category-btn`}
                    onClick={() => {
                      setSelectedCategory(cat._id);
                      setSelectedSubcategory('');
                      setSidebarOpen(false);
                    }}
                  >
                    📦 {cat.name}
                  </button>
                ))}
              </>
            ) : (
              // LEVEL 2: Show subcategories of selected category
              <>
                <button
                  className={`category-btn back-btn`}
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedSubcategory('');
                  }}
                >
                  ← Go Back
                </button>
                {categories.find(c => c._id === selectedCategory)?.subcategories?.map((subcat) => (
                  <button
                    key={subcat._id}
                    className={`category-btn ${selectedSubcategory === subcat._id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedSubcategory(subcat._id);
                      setSidebarOpen(false);
                    }}
                  >
                    {subcat.icon} {subcat.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="products-main-content">
          {/* Search Bar */}
          <div className="filters">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

        {loading ? (
          <p className="loading">Loading...</p>
        ) : products.length === 0 ? (
          <p className="loading">No products found for this category/search.</p>
        ) : (
          <div className={`products-slider ${selectedCategory ? 'category-view' : ''}`}>
            <div className={`products-scroll ${selectedCategory ? 'grid-layout' : ''}`} ref={scrollRef}>
            {products.map((product, index) => {
              const qty = getProductQuantity(product._id);
              return (
              <div key={product._id} className="product-card">
                <Link
                  to={`/products/${product._id}`}
                  className="product-color-box"
                  style={{ backgroundColor: getBoxColor(index) }}
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
                  {product.discount > 0 && (
                    <p className="discount">{product.discount}% OFF</p>
                  )}
                  <p className="delivery">⏱️ {product.deliveryTime} min</p>
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
            {products.length > 5 && !selectedCategory && (
              <button
                type="button"
                aria-label="Scroll products"
                className="slider-btn slider-btn-right"
                onClick={() => scrollProducts(1)}
              >
                ›
              </button>
            )}
          </div>
        )}
        </div>
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
              <p>Sign in to add items to your cart.</p>
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

export default Products;