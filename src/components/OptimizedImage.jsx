import React, { useState, memo } from 'react';

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '',
  style = {},
  width,
  height,
  priority = false,
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if width or height is explicitly set in the style prop
  const manualWidth = style?.width || null;
  const manualHeight = style?.height || null;

  const imageClasses = [
    // If NO manual width is provided in style, default to w-full
    !manualWidth && !/\bw-[^\s]+\b/.test(className) && 'w-full',
    // If NO manual height is provided in style, default to h-full
    !manualHeight && !/\bh-[^\s]+\b/.test(className) && 'h-full',
    'object-contain transition-all duration-500 ease-in-out',
    loading ? 'blur-sm' : 'blur-0',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!src) return <div className={`bg-gray-200 ${containerClassName}`}><div className="flex items-center justify-center h-full text-gray-400">No image</div></div>;

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {loading && <div className="absolute inset-0 bg-gray-100 animate-pulse z-0" />}
      {!error ? (
        <picture>
          <source srcSet={src.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            className={imageClasses}
            style={{
               ...style,
               // SDE-2 FORCE: Ensure the style object actually applies to the DOM element
               width: manualWidth || (style.height ? 'auto' : '100%'),
               height: manualHeight || (style.width ? 'auto' : '100%'),
            }}
            onError={() => setError(true)}
            onLoad={() => setLoading(false)}
          />
        </picture>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-xs">Failed to load</div>
      )}
    </div>
  );
});

export default OptimizedImage;