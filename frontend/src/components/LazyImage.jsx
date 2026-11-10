import React, { useState } from 'react';

/**
 * Optimizes Cloudinary and external image URLs on the fly
 * by applying modern WebP/AVIF format auto-negotiation and dynamic compression.
 */
export const optimizeImageUrl = (url, width = 360) => {
  if (!url || typeof url !== 'string') return url;

  // Cloudinary image on-the-fly transformation: f_auto (AVIF/WebP), q_auto (lossless visually), w_limit
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('f_auto') && !url.includes('q_auto')) {
      const transform = `f_auto,q_auto${width ? `,w_${width},c_limit` : ''}`;
      return url.replace('/upload/', `/upload/${transform}/`);
    }
  }

  return url;
};

const LazyImage = ({
  src,
  alt = '',
  className = '',
  width,
  height,
  fallbackSrc,
  priority = false, // When true (e.g. above-the-fold hero banner), eager loads with high priority
  style = {},
  containerStyle = {},
  onClick,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = optimizeImageUrl(src, width ? parseInt(width, 10) : 380);

  const handleError = (e) => {
    if (fallbackSrc && e.target.src !== fallbackSrc) {
      e.target.src = fallbackSrc;
    } else {
      setHasError(true);
    }
  };

  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={`lazy-img-fallback ${className}`} 
        style={{
          width: width || '100%',
          height: height || '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f4f6fb',
          color: '#888',
          borderRadius: '8px',
          fontSize: '13px',
          ...containerStyle
        }}
      >
        <span>{alt?.charAt(0)?.toUpperCase() || '📦'}</span>
      </div>
    );
  }

  return (
    <div 
      className={`lazy-img-wrap ${loaded ? 'is-loaded' : 'is-loading'}`} 
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: width || '100%',
        height: height || '100%',
        ...containerStyle
      }}
    >
      {!loaded && (
        <div 
          className="lazy-img-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #f0f2f5 25%, #e6e9ef 50%, #f0f2f5 75%)',
            backgroundSize: '200% 100%',
            animation: 'lazyShimmer 1.4s ease-in-out infinite'
          }} 
        />
      )}

      <img
        src={optimizedSrc}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        onClick={onClick}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.22s ease-in-out',
          width: '100%',
          height: '100%',
          objectFit: style.objectFit || 'contain',
          display: 'block',
          ...style
        }}
        {...props}
      />
    </div>
  );
};

export default LazyImage;
