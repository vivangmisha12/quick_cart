import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import LazyImage from '../components/LazyImage';
import {
  Heart,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';
import '../styles/Wishlist.css';

const Wishlist = () => {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [addedId, setAddedId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleAddToCart = async (product) => {
    await addToCart(product, 1);
    setAddedId(product._id);
    setTimeout(() => {
      setAddedId((prev) => (prev === product._id ? null : prev));
    }, 1500);
  };

  if (wishlist.length === 0) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-container">
          <div className="empty-wishlist">
            <div className="empty-icon-box">
              <Heart size={30} />
            </div>
            <h2>Your Wishlist is Empty</h2>
            <p>Save your favourite daily essentials here so you can add them to cart anytime.</p>
            <Link to="/products" className="continue-shopping-btn">
              <ShoppingBag size={16} />
              <span>Browse Products</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        <div className="wishlist-header">
          <div>
            <div className="wishlist-pill-badge">
              <Sparkles size={12} />
              <span>{wishlist.length} {wishlist.length === 1 ? 'Saved Item' : 'Saved Items'}</span>
            </div>
            <h1>My Wishlist</h1>
            <p>Quickly add saved items to your basket or view details</p>
          </div>

          <div className="wishlist-header-actions">
            {!confirmClear ? (
              <button
                type="button"
                className="clear-wishlist-btn"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 size={15} />
                <span>Clear All</span>
              </button>
            ) : (
              <div className="clear-confirm-pill">
                <span>Clear wishlist?</span>
                <button
                  type="button"
                  className="confirm-clear-yes"
                  onClick={() => {
                    clearWishlist();
                    setConfirmClear(false);
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="confirm-clear-no"
                  onClick={() => setConfirmClear(false)}
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="wishlist-grid">
          {wishlist.map((product) => {
            const isRecentlyAdded = addedId === product._id;
            const categoryLabel =
              typeof product.category === 'object'
                ? product.category?.name
                : product.category;
            const mrp =
              product.discount > 0
                ? Math.round(product.price / (1 - product.discount / 100))
                : product.originalPrice || null;
            const discountPercent =
              mrp && mrp > product.price
                ? Math.round(((mrp - product.price) / mrp) * 100)
                : 0;

            return (
              <div key={product._id} className="wishlist-card">
                <div
                  className="wishlist-image-container"
                  onClick={() => navigate(`/products/${product._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/products/${product._id}`);
                    }
                  }}
                >
                  <LazyImage
                    src={product.image || 'https://via.placeholder.com/200x200?text=No+Image'}
                    alt={product.name}
                    className="wishlist-image"
                    width={200}
                    height={200}
                  />

                  {discountPercent > 0 && (
                    <span className="wishlist-discount-badge">{discountPercent}% OFF</span>
                  )}

                  <button
                    type="button"
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWishlist(product._id);
                    }}
                    title="Remove from wishlist"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="wishlist-card-content">
                  <p className="category">{categoryLabel || 'Grocery'}</p>
                  <h3>{product.name}</h3>

                  <div className="price-section">
                    <span className="price">₹{product.price}</span>
                    {mrp && mrp > product.price && (
                      <span className="original-price">₹{mrp}</span>
                    )}
                  </div>

                  <div className="wishlist-card-actions">
                    <button
                      type="button"
                      className={`wishlist-add-cart-btn ${isRecentlyAdded ? 'is-added' : ''}`}
                      onClick={() => handleAddToCart(product)}
                    >
                      {isRecentlyAdded ? (
                        <>
                          <Check size={15} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={15} />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    <Link to={`/products/${product._id}`} className="view-product-btn">
                      <Eye size={14} />
                      <span>Details</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
