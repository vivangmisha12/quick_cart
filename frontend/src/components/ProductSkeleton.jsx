import React from 'react';
import '../styles/ProductCard.css';

const ProductSkeleton = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="blinkit-product-card skeleton-card">
          <div className="card-image-box skeleton-shimmer" />
          <div className="card-info-box">
            <div className="skeleton-line line-title skeleton-shimmer" />
            <div className="skeleton-line line-unit skeleton-shimmer" />
            <div className="card-bottom-row" style={{ marginTop: '12px' }}>
              <div className="skeleton-line line-price skeleton-shimmer" />
              <div className="skeleton-line line-btn skeleton-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ProductSkeleton;

