import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  SlidersHorizontal, 
  Search, 
  X, 
  ChevronRight, 
  PackageOpen, 
  ArrowUpDown,
  Lock
} from 'lucide-react';
import { productsAPI, categoriesAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import LazyImage from '../components/LazyImage';
import '../styles/Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('subcategory') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'relevance';

  const [searchInput, setSearchInput] = useState(searchParam);
  const [sortBy, setSortBy] = useState(sortParam);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { user, login } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setSearchInput(searchParam);
    fetchProducts(selectedCategory, selectedSubcategory, searchParam);
  }, [selectedCategory, selectedSubcategory, searchParam]);

  useEffect(() => {
    setSortBy(sortParam);
  }, [sortParam]);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async (catId, subCatId, searchTerm) => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll(catId, searchTerm, subCatId);
      setProducts(res.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (catId) => {
    const params = new URLSearchParams(searchParams);
    if (catId) {
      params.set('category', catId);
    } else {
      params.delete('category');
    }
    params.delete('subcategory');
    setSearchParams(params);
    setSidebarOpen(false);
  };

  const handleSubcategoryClick = (subId) => {
    const params = new URLSearchParams(searchParams);
    if (subId) {
      params.set('subcategory', subId);
    } else {
      params.delete('subcategory');
    }
    setSearchParams(params);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const requireLoginHandler = (productId) => {
    if (!user) {
      setPendingProductId(productId);
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await login(loginEmail, loginPassword);
      if (response?.user?.isAdmin) {
        navigate('/admin', { replace: true });
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

  // Process Sorting
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'discount') return (b.discount || 0) - (a.discount || 0);
    return 0; // relevance
  });

  const activeCategoryObj = categories.find((c) => c._id === selectedCategory);
  const subcategoriesList = activeCategoryObj?.subcategories || [];

  return (
    <div className={`products-catalog-page ${showLoginModal ? 'modal-blur-active' : ''}`}>
      {/* Mobile Sidebar Toggle Header */}
      <div className="mobile-catalog-header">
        <button 
          className="mobile-sidebar-toggle-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <SlidersHorizontal size={16} />
          <span>Categories</span>
        </button>
        <span className="mobile-results-count">{sortedProducts.length} items</span>
      </div>

      <div className="catalog-layout-container">
        {/* Left Sticky Category Sidebar */}
        <aside className={`catalog-categories-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-top-bar">
            <h3>Categories</h3>
            <button 
              className="sidebar-close-action"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close categories"
            >
              <X size={18} />
            </button>
          </div>

          <div className="categories-vertical-menu">
            <button
              className={`cat-menu-item ${!selectedCategory ? 'is-active' : ''}`}
              onClick={() => handleCategoryClick('')}
            >
              <span className="cat-item-icon">🛍️</span>
              <span className="cat-item-text">All Products</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat._id}
                className={`cat-menu-item ${selectedCategory === cat._id ? 'is-active' : ''}`}
                onClick={() => handleCategoryClick(cat._id)}
              >
                {cat.image || cat.name ? (
                  <LazyImage 
                    src={cat.image?.startsWith('http') ? cat.image : (cat.image ? (cat.image.startsWith('/') ? cat.image : `/${cat.image}`) : `/category-images/${cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`)} 
                    alt={cat.name} 
                    className="cat-item-thumb" 
                    width={32}
                    height={32}
                    containerStyle={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 }}
                    fallbackSrc={`/category-images/${cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`}
                  />
                ) : (
                  <span className="cat-item-icon">{cat.icon || '📦'}</span>
                )}
                <span className="cat-item-text">{cat.name}</span>
                {selectedCategory === cat._id && (
                  <ChevronRight size={14} className="cat-active-chevron" />
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            className="sidebar-backdrop-overlay" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Right Main Catalog Content */}
        <main className="catalog-main-content">
          {/* Top Subcategories Pills & Sort Bar */}
          <div className="catalog-toolbar">
            <div className="toolbar-left-col">
              <h1 className="catalog-heading">
                {activeCategoryObj ? activeCategoryObj.name : 'All Products'}
                <span className="products-total-count">({sortedProducts.length})</span>
              </h1>

              {/* Subcategories Scroll Row */}
              {subcategoriesList.length > 0 && (
                <div className="subcategories-pills-row">
                  <button
                    className={`subcat-pill ${!selectedSubcategory ? 'active' : ''}`}
                    onClick={() => handleSubcategoryClick('')}
                  >
                    All
                  </button>
                  {subcategoriesList.map((sub) => (
                    <button
                      key={sub._id}
                      className={`subcat-pill ${selectedSubcategory === sub._id ? 'active' : ''}`}
                      onClick={() => handleSubcategoryClick(sub._id)}
                    >
                      {sub.icon && <span className="sub-icon">{sub.icon}</span>}
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="toolbar-right-col">
              <div className="sort-dropdown-wrap">
                <ArrowUpDown size={14} className="sort-icon" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select-input"
                >
                  <option value="relevance">Sort by: Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="discount">Biggest Discount</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Search Filter Badge */}
          {searchParam && (
            <div className="active-filter-chip-bar">
              <span>Search results for: <strong>"{searchParam}"</strong></span>
              <button 
                type="button" 
                className="clear-search-pill"
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.delete('search');
                  setSearchParams(p);
                }}
              >
                Clear <X size={12} />
              </button>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="catalog-products-grid">
              <ProductSkeleton count={8} />
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="catalog-empty-state">
              <div className="empty-icon-box">
                <PackageOpen size={48} color="#8892a0" />
              </div>
              <h3>No products found</h3>
              <p>We couldn't find any products matching your current filters or search.</p>
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Browse All Products
              </button>
            </div>
          ) : (
            <div className="catalog-products-grid">
              {sortedProducts.map((prod) => (
                <ProductCard 
                  key={prod._id}
                  product={prod}
                  onRequireLogin={requireLoginHandler}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Auth Modal */}
      {showLoginModal && (
        <div className="login-modal-backdrop" role="dialog" aria-modal="true">
          <div className="login-modal-card">
            <button className="login-modal-close" onClick={() => setShowLoginModal(false)} aria-label="Close">
              <X size={20} />
            </button>
            <div className="login-modal-top">
              <div className="login-secure-chip">
                <Lock size={12} />
                <span>100% Secure Checkout</span>
              </div>
              <h3>Sign In to Progicart</h3>
              <p>Add products to your cart & get instant delivery.</p>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
