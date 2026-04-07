import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import '../styles/Wishlist.css';

const Wishlist = () => {
  const { wishlist, removeFromWishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="wishlist-container">
        <div className="empty-wishlist">
          <div className="empty-icon">💔</div>
          <h2>Your Wishlist is Empty</h2>
          <p>Add products to your wishlist to save them for later</p>
          <Link to="/products" className="continue-shopping-btn">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-container">
      <h1>My Wishlist</h1>
      <div className="wishlist-grid">
        {wishlist.map((product) => (
          <div key={product._id} className="wishlist-card">
            <div className="wishlist-image-container">
              <img
                src={product.image || 'https://via.placeholder.com/200x200?text=No+Image'}
                alt={product.name}
                className="wishlist-image"
              />
              <button
                className="remove-btn"
                onClick={() => removeFromWishlist(product._id)}
                title="Remove from wishlist"
              >
                ❌
              </button>
            </div>
            <div className="wishlist-card-content">
              <h3>{product.name}</h3>
              <p className="category">{product.category}</p>
              <div className="price-section">
                <span className="price">₹{product.price}</span>
                {product.originalPrice && (
                  <span className="original-price">₹{product.originalPrice}</span>
                )}
              </div>
              <Link to={`/products/${product._id}`} className="view-product-btn">
                View Product
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;
