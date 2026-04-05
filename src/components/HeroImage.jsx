import React, { useState } from 'react';

const HeroImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-full bg-charcoal overflow-hidden">
      {/* 1. Placeholder: A simple shimmer effect while the big image downloads */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse z-10" />
      )}

      {/* 2. High-res image */}
      <img
        src={src}
        alt={alt}
        // ✅ Fixed: React requires camelCase 'fetchPriority'
        fetchPriority="high" 
        loading="eager"
        onLoad={() => setIsLoaded(true)}
        className={`${className} transition-opacity duration-1000 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        // Log error if path is broken
        onError={() => console.error("HeroImage component failed to load:", src)}
      />
    </div>
  );
};

export default HeroImage;