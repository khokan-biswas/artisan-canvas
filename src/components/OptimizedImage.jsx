import React, { useState, memo } from 'react';

/**
 * OptimizedImage Component - FAST IMAGE LOADING
 * Features:
 * - Native lazy loading
 * - Blur placeholder effect with skeleton loader
 * - WebP format support with fallback
 * - Error handling
 * - Responsive images
 */
const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '',
  width,
  height,
  sizes,
  priority = false,
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src) {
    return (
      <div className={`bg-gray-200 ${containerClassName}`}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-400 text-sm">No image</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${containerClassName}`}
      style={{
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
      }}
    >
      {/* ⚡ OPTIMIZATION: Blur Placeholder while loading */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse z-0" />
      )}

      {!error ? (
        <>
          {/* ⚡ OPTIMIZATION: WebP with fallback (modern browsers get WebP, others get JPEG) */}
          <picture>
            {/* Try WebP first (smaller file size) */}
            <source 
              srcSet={src.replace(/\.(jpg|jpeg|png)$/i, '.webp')} 
              type="image/webp"
            />
            {/* Fallback to original format */}
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes={sizes}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              className={`w-full h-full object-cover ${loading ? 'blur-sm' : ''} transition-all duration-300 ${className}`}
              onError={() => setError(true)}
              onLoad={() => setLoading(false)}
            />
          </picture>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 z-10">
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
