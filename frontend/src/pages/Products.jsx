import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  SlidersHorizontal, 
  X, 
  ChevronRight, 
  ChevronDown,
  LayoutGrid,
  PackageOpen, 
  ArrowUpDown,
  Lock
} from 'lucide-react';
import { productsAPI, categoriesAPI } from '../api/api';
import ProductCard from '../components/ProductCard';
import ProductSkeleton from '../components/ProductSkeleton';
import LazyImage from '../components/LazyImage';
import '../styles/Products.css';

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'https://quick-cart-qnz6.onrender.com/api'
).replace(/\/api\/?$/, '');

const resolveCatalogImg = (rawPath) => {
  if (!rawPath) return '';
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
  if (rawPath.startsWith('/uploads/')) return `${API_ORIGIN}${rawPath}`;
  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('subcategory') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'relevance';
  const openSubParam = searchParams.get('openSubcategories') === '1';

  const [sortBy, setSortBy] = useState(sortParam);
  const [priceFilter, setPriceFilter] = useState('all');
  const [discountOnly, setDiscountOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [mobileShowCategories, setMobileShowCategories] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(selectedCategory, selectedSubcategory, searchParam);
  }, [selectedCategory, selectedSubcategory, searchParam]);

  useEffect(() => {
    setSortBy(sortParam);
  }, [sortParam]);

  useEffect(() => {
    if (!openSubParam) return;
    setMobileShowCategories(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('openSubcategories');
    setSearchParams(nextParams, { replace: true });
  }, [openSubParam, searchParams, setSearchParams]);

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
    const clickedCat = categories.find((c) => c._id === catId);
    if (clickedCat?.subcategories?.length) {
      setMobileShowCategories(false);
    } else {
      setSidebarOpen(false);
    }
  };

  const handleSubcategoryClick = (subId) => {
    const params = new URLSearchParams(searchParams);
    if (subId) {
      params.set('subcategory', subId);
    } else {
      params.delete('subcategory');
    }
    setSearchParams(params);
    setSidebarOpen(false);
  };

  const clearAllFilters = () => {
    setPriceFilter('all');
    setDiscountOnly(false);
    setInStockOnly(false);
    setTrendingOnly(false);
    setSortBy('relevance');
    setSearchParams({});
  };

  // Process Filtering & Sorting
  const filteredProducts = products.filter((prod) => {
    const price = Number(prod.price) || 0;
    if (priceFilter === 'under-100' && price >= 100) return false;
    if (priceFilter === '100-300' && (price < 100 || price > 300)) return false;
    if (priceFilter === 'above-300' && price <= 300) return false;
    if (discountOnly && !((prod.discount || 0) > 0 || (prod.originalPrice && prod.originalPrice > price))) {
      return false;
    }
    if (inStockOnly && (prod.stock ?? 0) <= 0) return false;
    if (trendingOnly && !prod.isTrending) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'discount') return (b.discount || 0) - (a.discount || 0);
    return 0; // relevance
  });

  const activeCategoryObj = categories.find((c) => c._id === selectedCategory);
  const subcategoriesList = [...(activeCategoryObj?.subcategories || [])].sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );
  const activeSubcategoryObj = subcategoriesList.find((s) => s._id === selectedSubcategory);
  const hasActiveMobileFilters =
    priceFilter !== 'all' || discountOnly || inStockOnly || trendingOnly || sortBy !== 'relevance';

  const getCategoryThumbSrc = (cat) => {
    if (!cat) return '';
    if (cat.image) return resolveCatalogImg(cat.image);
    const slug = cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `/category-images/${slug}.jpg`;
  };

  const renderSubcategoryThumb = (sub) => {
    const src = sub.image ? resolveCatalogImg(sub.image) : '';
    if (!src) {
      return <span className="subcat-rail-fallback">{sub.icon || '📦'}</span>;
    }
    return (
      <img
        src={src}
        alt={sub.name}
        className="subcat-rail-img"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  };

  const renderSubcategoryCards = (cardClassName) => (
    <>
      <button
        type="button"
        className={`${cardClassName} ${!selectedSubcategory ? 'is-active' : ''}`}
        onClick={() => handleSubcategoryClick('')}
      >
        <div className="subcat-rail-thumb-box">
          {activeCategoryObj && (
            <img
              src={getCategoryThumbSrc(activeCategoryObj)}
              alt="All"
              className="subcat-rail-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </div>
        <span className="subcat-rail-label">All</span>
      </button>

      {subcategoriesList.map((sub) => (
        <button
          type="button"
          key={sub._id}
          className={`${cardClassName} ${selectedSubcategory === sub._id ? 'is-active' : ''}`}
          onClick={() => handleSubcategoryClick(sub._id)}
        >
          <div className="subcat-rail-thumb-box">
            {renderSubcategoryThumb(sub)}
            <span
              className="subcat-rail-fallback"
              style={{ display: sub.image ? 'none' : 'flex' }}
            >
              {sub.icon || '📦'}
            </span>
          </div>
          <span className="subcat-rail-label" title={sub.name}>{sub.name}</span>
        </button>
      ))}
    </>
  );

  return (
    <div className="products-catalog-page">
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
        {/* Left Sticky Unified Category & Subcategory Panel */}
        <aside className={`catalog-categories-sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${subcategoriesList.length > 0 ? 'has-subcategories' : ''}`}>
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

          <div className="catalog-sidebar-body">
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
                      src={getCategoryThumbSrc(cat)} 
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

            {/* Subcategories Column inside the same Category Panel */}
            {subcategoriesList.length > 0 && (
              <div className="catalog-subcategories-rail" aria-label="Subcategories">
                <div className="subcat-rail-header">
                  <span>Subcategories</span>
                </div>
                <div className="subcat-rail-list">
                  {renderSubcategoryCards('subcat-rail-card')}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Permanent Mobile Sticky Left Subcategory / Category Rail */}
        <aside className="mobile-catalog-left-rail" aria-label="Subcategories navigation">
          {subcategoriesList.length > 0 && !mobileShowCategories ? (
            <>
              <button
                type="button"
                className="mobile-rail-switch-btn"
                onClick={() => setMobileShowCategories(true)}
              >
                <LayoutGrid size={14} />
                <span>All Cats</span>
              </button>
              {renderSubcategoryCards('mobile-left-rail-card')}
            </>
          ) : (
            <>
              <button
                type="button"
                className={`mobile-left-rail-card ${!selectedCategory ? 'is-active' : ''}`}
                onClick={() => {
                  setMobileShowCategories(false);
                  handleCategoryClick('');
                }}
              >
                <div className="subcat-rail-thumb-box">
                  <span className="subcat-rail-fallback">🛍️</span>
                </div>
                <span className="subcat-rail-label">All Items</span>
              </button>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat._id}
                  className={`mobile-left-rail-card ${selectedCategory === cat._id ? 'is-active' : ''}`}
                  onClick={() => handleCategoryClick(cat._id)}
                >
                  <div className="subcat-rail-thumb-box">
                    <img
                      src={getCategoryThumbSrc(cat)}
                      alt={cat.name}
                      className="subcat-rail-img"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <span className="subcat-rail-fallback" style={{ display: 'none' }}>
                      {cat.icon || '📦'}
                    </span>
                  </div>
                  <span className="subcat-rail-label" title={cat.name}>{cat.name}</span>
                </button>
              ))}
            </>
          )}
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
          {/* Mobile Horizontal Filter & Sort Pills Bar */}
          <div className="mobile-filter-pills-row" aria-label="Filters">
            <div className={`mobile-filter-select-pill ${sortBy !== 'relevance' ? 'is-active' : ''}`}>
              <ArrowUpDown size={13} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
              >
                <option value="relevance">Sort</option>
                <option value="price-low">Price: Low-High</option>
                <option value="price-high">Price: High-Low</option>
                <option value="discount">Discount</option>
              </select>
              <ChevronDown size={13} />
            </div>

            <div className={`mobile-filter-select-pill ${priceFilter !== 'all' ? 'is-active' : ''}`}>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                aria-label="Filter by price"
              >
                <option value="all">Price</option>
                <option value="under-100">Under ₹100</option>
                <option value="100-300">₹100 - ₹300</option>
                <option value="above-300">₹300+</option>
              </select>
              <ChevronDown size={13} />
            </div>

            <button
              type="button"
              className={`mobile-filter-toggle-pill ${discountOnly ? 'is-active' : ''}`}
              onClick={() => setDiscountOnly((prev) => !prev)}
            >
              Offers
            </button>

            <button
              type="button"
              className={`mobile-filter-toggle-pill ${inStockOnly ? 'is-active' : ''}`}
              onClick={() => setInStockOnly((prev) => !prev)}
            >
              In Stock
            </button>

            <button
              type="button"
              className={`mobile-filter-toggle-pill ${trendingOnly ? 'is-active' : ''}`}
              onClick={() => setTrendingOnly((prev) => !prev)}
            >
              Popular
            </button>

            {hasActiveMobileFilters && (
              <button
                type="button"
                className="mobile-filter-toggle-pill reset-pill"
                onClick={() => {
                  setPriceFilter('all');
                  setDiscountOnly(false);
                  setInStockOnly(false);
                  setTrendingOnly(false);
                  setSortBy('relevance');
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Top Title & Sort Bar */}
          <div className="catalog-toolbar">
            <div className="toolbar-left-col">
              <h1 className="catalog-heading">
                {activeSubcategoryObj?.name || activeCategoryObj?.name || 'All Products'}
                <span className="products-total-count">({sortedProducts.length})</span>
              </h1>
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
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Products;
