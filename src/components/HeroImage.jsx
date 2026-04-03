import React, { useState } from 'react';

const HeroImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Assuming WebP version exists with .webp extension
  const webpSrc = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const lowResSrc = src.replace(/\.(png|jpg|jpeg|webp)$/i, '_lowres.jpg'); // Assuming a low-res version exists

  return (
    <div className="relative w-full h-full">
      {/* Low-res blurred placeholder */}
      {!isLoaded && (
        <img
          src={lowResSrc}
          alt={alt}
          className={`${className} blur-sm scale-110`}
          style={{ filter: 'blur(10px)' }}
        />
      )}
      {/* High-res image */}
      <picture className={className}>
        <source srcSet={webpSrc} type="image/webp" />
        <img
          src={src}
          alt={alt}
          fetchpriority="high"
          loading="eager"
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
          onLoad={() => setIsLoaded(true)}
        />
      </picture>
    </div>
  );
};

export default HeroImage;