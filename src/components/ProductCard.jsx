import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from './OptimizedImage.jsx';
import service from '../backend/config';

const ProductCard = memo(({ painting }) => {

  // --- 0. SAFETY CHECK ---
  if (!painting) {
//     console.warn("ProductCard: Missing painting data");
    return null;
  }

  // --- 1. IMAGE HANDLING ---
  const imageUrl = useMemo(() => {
    if (!painting.imageUrl) return 'https://via.placeholder.com/400x300?text=No+Image'; // Fallback
    return service.getThumbnail(painting.imageUrl);
  }, [painting.imageUrl]);

  // --- 2. PRICE & DISCOUNT CALCULATION ---
  const calculateFinalPrice = (price, discountPercent) => {
    if (!discountPercent || discountPercent <= 0) return price;

    const discountedPrice = price - (price * (discountPercent / 100));
    return Math.round(discountedPrice);
  };

  // USD Data
  const sellingUSD = painting.priceusd || painting.price || 0;
  const discountUSD = Number(painting.discountusd ?? painting.discount ?? 0);
  const finalUSD = calculateFinalPrice(sellingUSD, discountUSD);

  // INR Data
  const sellingINR = painting.pricein || 0;
  const discountINR = Number(painting.discountin ?? painting.discount ?? 0);
  const finalINR = calculateFinalPrice(sellingINR, discountINR);
  const hasDiscount = discountUSD > 0 || discountINR > 0;

  return (
    <Link to={`/product/${painting.$id}`} className="group cursor-pointer block h-full">
      <div className="bg-white rounded-lg shadow-sm border border-[#EBE7DE] p-3 hover:shadow-xl hover:border-charcoal transition-all duration-300 h-full flex flex-col">

        {/* --- IMAGE CONTAINER --- */}
        <div className="w-full mb-4 relative aspect-[4/5] overflow-hidden bg-gray-100 rounded-sm">

          {/* SALE BADGE */}
          {(!painting.isSold && hasDiscount) && (
            <div className="absolute top-3 right-3 z-20 bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full shadow-sm">
              Sale
            </div>
          )}

          {/* SOLD OUT BADGE */}
          {painting.isSold && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-charcoal text-white text-xs font-bold px-4 py-2 uppercase tracking-widest border border-white">
                Sold Out
              </span>
            </div>
          )}

          {/* IMAGE */}
          <OptimizedImage
            src={imageUrl}
            alt={painting.title}
            width={480}
            height={600}
            className={`transition-transform duration-700 group-hover:scale-110 ${painting.isSold ? 'grayscale' : ''}`}
            containerClassName="w-full h-full"
          />

          {/* HOVER ACTION (Quick Add) */}
          {!painting.isSold && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-3 text-center translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">View Details</span>
            </div>
          )}
        </div>

        {/* --- INFO SECTION --- */}
        <div className="flex-grow flex flex-col justify-between space-y-3">

          {/* Title & Artist */}
          <div>
            <h3 className="text-lg font-bold text-charcoal font-serif leading-tight line-clamp-1">
              {painting.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {painting.artist || "Unknown Artist"} • {painting.category}
            </p>
          </div>

          {/* --- DUAL PRICE DISPLAY --- */}
          <div className="pt-3 border-t border-[#EBE7DE] space-y-1">

            {/* 1. USD PRICE (Primary) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-charcoal font-serif">
                  ${finalUSD.toLocaleString()}
                </span>
                {discountUSD > 0 && sellingUSD > finalUSD && (
                  <span className="text-xs text-gray-400 line-through decoration-gray-300">
                    ${sellingUSD.toLocaleString()}
                  </span>
                )}
              </div>
              {discountUSD > 0 && (
                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-sm border border-green-100">
                  {discountUSD}% OFF
                </span>
              )}
            </div>

            {/* 2. INR PRICE (Secondary) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600 font-serif">
                  ₹{finalINR.toLocaleString()}
                </span>
                {discountINR > 0 && sellingINR > finalINR && (
                  <span className="text-[10px] text-gray-300 line-through">
                    ₹{sellingINR.toLocaleString()}
                  </span>
                )}
              </div>
              {discountINR > 0 && (
                <span className="text-[10px] font-medium text-green-600">
                  {discountINR}% OFF
                </span>
              )}
            </div>

          </div>
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
