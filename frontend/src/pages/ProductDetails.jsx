import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Clock, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  ChevronRight, 
  Plus, 
  Minus,
  Sparkles,
  ShoppingBag,
  ArrowLeft
} from 'lucide-react';
import { productsAPI } from '../api/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import LazyImage from '../components/LazyImage';
import '../styles/ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, getProductQuantity, updateCartItem, removeFromCart, openCartDrawer } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await productsAPI.getById(id);
        if (isMounted) setProduct(res.data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const qty = product ? getProductQuantity(product._id) : 0;
  const isWish = product ? isInWishlist(product._id) : false;

  const handleAddToCart = () => {
    if (!user) {
      if (openAuthModal) {
        openAuthModal({
          title: 'Sign in to Shop',
          subtitle: 'Log in to add this item to your cart & get lightning 10-min delivery.',
          onSuccess: () => {
            addToCart(product, 1);
            openCartDrawer();
          },
        });
      }
      return;
    }
    addToCart(product, 1);
    openCartDrawer();
  };

  const handleIncrement = () => {
    if (!user) {
      if (openAuthModal) {
        openAuthModal({
          title: 'Sign in to Shop',
          subtitle: 'Log in to add this item to your cart & get lightning 10-min delivery.',
          onSuccess: () => addToCart(product, 1),
        });
      }
      return;
    }
    addToCart(product, 1);
  };

  const handleDecrement = () => {
    if (qty > 1) {
      updateCartItem(product._id, qty - 1);
    } else if (qty === 1) {
      removeFromCart(product._id);
    }
  };

  const handleWishlistToggle = () => {
    if (!user) {
      if (openAuthModal) {
        openAuthModal({
          title: 'Sign in for Wishlist',
          subtitle: 'Log in to save your favorite groceries to your wishlist.',
          onSuccess: () => addToWishlist(product),
        });
      }
      return;
    }
    if (isWish) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist(product);
    }
  };

  if (loading) {
    return (
      <div className="pd-page">
        <div className="pd-skeleton-layout">
          <div className="pd-img-skeleton skeleton-shimmer" />
          <div className="pd-info-skeleton">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '32px' }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '18px', marginTop: '12px' }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '40px', marginTop: '24px' }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '120px', marginTop: '24px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pd-page">
        <div className="pd-not-found-card">
          <ShoppingBag size={48} color="#8892a0" />
          <h2>Product Not Found</h2>
          <p>The product you are looking for does not exist or has been removed.</p>
          <Link to="/products" className="pd-back-home-btn">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const mrp = product.discount > 0 
    ? Math.round(product.price / (1 - product.discount / 100)) 
    : (product.originalPrice || null);

  return (
    <div className="pd-page">
      {/* Breadcrumb Navigation with Back Button */}
      <nav className="pd-breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="pd-back-btn"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/products'))}
          aria-label="Go back"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
        <span className="pd-breadcrumb-divider" aria-hidden="true">/</span>
        <Link to="/">Home</Link>
        <ChevronRight size={14} className="breadcrumb-arrow" />
        <Link to="/products">Products</Link>
        <ChevronRight size={14} className="breadcrumb-arrow" />
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div className="pd-grid-container">
        {/* Left Side: Product Showcase */}
        <div className="pd-image-section">
          <div className="pd-image-wrapper">
            {product.discount > 0 && (
              <span className="pd-floating-discount-tag">{product.discount}% OFF</span>
            )}
            <button
              type="button"
              className={`pd-wishlist-toggle ${isWish ? 'is-active' : ''}`}
              onClick={handleWishlistToggle}
              aria-label={isWish ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={20} fill={isWish ? '#e23744' : 'none'} color={isWish ? '#e23744' : '#666'} />
            </button>
            {product.image ? (
              <LazyImage src={product.image} alt={product.name} className="pd-main-img" priority={true} width={450} height={400} />
            ) : (
              <div className="pd-img-fallback-circle">
                <span>{product.name?.charAt(0)?.toUpperCase() || 'P'}</span>
              </div>
            )}
          </div>

          {/* Quick Assurance Badges */}
          <div className="pd-trust-highlights">
            <div className="trust-highlight-row">
              <Truck size={18} color="#0c831f" />
              <div className="trust-highlight-text">
                <strong>Superfast 10 Mins Delivery</strong>
                <span>Get it delivered at lightning speed from nearby dark store</span>
              </div>
            </div>
            <div className="trust-highlight-row">
              <ShieldCheck size={18} color="#0c831f" />
              <div className="trust-highlight-text">
                <strong>100% Quality Guarantee</strong>
                <span>Handpicked & safely packed under strict hygiene</span>
              </div>
            </div>
            <div className="trust-highlight-row">
              <RotateCcw size={18} color="#0c831f" />
              <div className="trust-highlight-text">
                <strong>Easy Instant Returns</strong>
                <span>Instant return at doorstep if not satisfied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Product Details */}
        <div className="pd-info-section">
          <div className="pd-eta-pill">
            <Clock size={14} color="#0c831f" />
            <span>Delivery in 10 minutes</span>
          </div>

          <h1 className="pd-title">{product.name}</h1>
          <span className="pd-unit-badge">{product.unit || '1 unit'}</span>

          {/* Pricing Box */}
          <div className="pd-pricing-card">
            <div className="pd-prices-group">
              <span className="pd-current-price">₹{product.price}</span>
              {mrp && mrp > product.price && (
                <span className="pd-mrp-price">MRP ₹{mrp}</span>
              )}
              {product.discount > 0 && (
                <span className="pd-savings-pill">{product.discount}% OFF</span>
              )}
            </div>
            <p className="pd-tax-note">(Inclusive of all taxes)</p>

            {/* Action Buttons */}
            <div className="pd-action-row">
              {product.stock === 0 ? (
                <div className="pd-out-of-stock-box">Currently Out of Stock</div>
              ) : qty > 0 ? (
                <div className="pd-stepper-control">
                  <button type="button" className="pd-stepper-btn" onClick={handleDecrement}>
                    <Minus size={16} strokeWidth={3} />
                  </button>
                  <span className="pd-stepper-num">{qty} in Cart</span>
                  <button type="button" className="pd-stepper-btn" onClick={handleIncrement}>
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button type="button" className="pd-add-to-cart-btn" onClick={handleAddToCart}>
                  Add to Cart
                </button>
              )}
            </div>
          </div>

          {/* Product Specifications & Details Card */}
          <div className="pd-details-card">
            <h3 className="pd-details-heading">Product Details</h3>

            <div className="pd-spec-row">
              <span className="pd-spec-key">Unit</span>
              <span className="pd-spec-val">{product.unit || '1 unit'}</span>
            </div>

            {product.description && (
              <div className="pd-spec-row pd-desc-row">
                <span className="pd-spec-key">Description</span>
                <p className="pd-spec-val pd-desc-text">{product.description}</p>
              </div>
            )}

            <div className="pd-spec-row">
              <span className="pd-spec-key">Shelf Life</span>
              <span className="pd-spec-val">Check packaging for expiry details</span>
            </div>

            <div className="pd-spec-row">
              <span className="pd-spec-key">Country of Origin</span>
              <span className="pd-spec-val">India</span>
            </div>
          </div>

          {/* Why Shop From Us */}
          <div className="pd-why-shop-box">
            <h4>Why shop from Progicart?</h4>
            <div className="why-features-grid">
              <div className="why-feature-item">
                <div className="why-icon-circle">⚡</div>
                <div className="why-text-col">
                  <strong>Superfast Delivery</strong>
                  <p>Get your order delivered to your doorstep in minutes.</p>
                </div>
              </div>
              <div className="why-feature-item">
                <div className="why-icon-circle">💰</div>
                <div className="why-text-col">
                  <strong>Best Prices & Offers</strong>
                  <p>Direct from brands with incredible deals daily.</p>
                </div>
              </div>
              <div className="why-feature-item">
                <div className="why-icon-circle">🛍️</div>
                <div className="why-text-col">
                  <strong>Wide Assortment</strong>
                  <p>Choose from 5,000+ authentic items across all categories.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
