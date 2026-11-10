import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import LazyImage from './LazyImage';
import '../styles/ProductCard.css';

const ProductCard = ({ product, onRequireLogin }) => {
  const { addToCart, getProductQuantity, updateCartItem, removeFromCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  if (!product) return null;

  const id = product._id;
  const qty = getProductQuantity(id);
  const isWish = isInWishlist(id);
  const mrp = product.discount > 0 
    ? Math.round(product.price / (1 - product.discount / 100)) 
    : (product.originalPrice || null);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRequireLogin) {
      const allowed = onRequireLogin(id);
      if (!allowed) return;
    }
    await addToCart(id, 1);
  };

  const handleIncrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(id, 1);
  };

  const handleDecrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty > 1) {
      await updateCartItem(id, qty - 1);
    } else {
      await removeFromCart(id);
    }
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWish) {
      removeFromWishlist(id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <div className="blinkit-product-card">
      {/* Top Image Box */}
      <Link to={`/products/${id}`} className="card-image-box">
        {/* 10 Min Delivery Tag */}
        <div className="card-delivery-tag">
          <Clock size={11} />
          <span>{product.deliveryTime || '10'} MINS</span>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`card-wishlist-btn ${isWish ? 'is-active' : ''}`}
          onClick={handleWishlistToggle}
          aria-label={isWish ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} fill={isWish ? '#e23744' : 'none'} color={isWish ? '#e23744' : '#666'} />
        </button>

        {/* Product Image with Lazy Loading & Auto WebP/AVIF */}
        {product.image ? (
          <LazyImage 
            src={product.image} 
            alt={product.name} 
            className="product-image" 
            width={260}
          />
        ) : (
          <div className="product-img-fallback">
            <span>{product.name?.charAt(0)?.toUpperCase() || 'P'}</span>
          </div>
        )}

        {/* Discount Badge */}
        {product.discount > 0 && (
          <div className="card-discount-badge">
            {product.discount}% OFF
          </div>
        )}
      </Link>

      {/* Product Information */}
      <div className="card-info-box">
        <Link to={`/products/${id}`} className="product-title-link">
          <h3 className="product-title" title={product.name}>
            {product.name}
          </h3>
        </Link>
        
        <span className="product-unit">{product.unit || '1 unit'}</span>

        {/* Price & Action Row */}
        <div className="card-bottom-row">
          <div className="product-pricing">
            <span className="current-price">₹{product.price}</span>
            {mrp && mrp > product.price && (
              <span className="mrp-price">₹{mrp}</span>
            )}
          </div>

          <div className="product-action-col">
            {product.stock === 0 ? (
              <span className="out-of-stock-label">Out of Stock</span>
            ) : qty > 0 ? (
              <div className="blinkit-stepper-pill">
                <button 
                  type="button" 
                  className="stepper-action-btn"
                  onClick={handleDecrement}
                  aria-label="Decrease"
                >
                  <Minus size={13} strokeWidth={3} />
                </button>
                <span className="stepper-qty-num">{qty}</span>
                <button 
                  type="button" 
                  className="stepper-action-btn"
                  onClick={handleIncrement}
                  aria-label="Increase"
                >
                  <Plus size={13} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="blinkit-add-card-btn"
                onClick={handleAdd}
              >
                ADD
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

