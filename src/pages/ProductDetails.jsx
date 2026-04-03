import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import service from '../backend/config.js';
import { ShoppingCart, CreditCard, Loader2, X, LogIn } from 'lucide-react';
import OptimizedImage from '../components/OptimizedImage.jsx';
import roomBackground from '../assets/gray-sofa-brown-living-room-with-copy-space.jpg';

const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const authStatus = useSelector((state) => state.auth.status);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showARModal, setShowARModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  // ===============================
  // FETCH PRODUCT
  // ===============================
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!slug) return;
        setLoading(true);
        const data = await service.getPainting(slug);
        if (!data) {
          setProduct(null);
          return;
        }

        const mainImgUrl = service.getThumbnail(data.imageUrl);
        const galleryUrls = Array.isArray(data.gallery)
          ? data.gallery.map((img) => service.getThumbnail(img))
          : [];

        const finalProduct = { ...data, mainImgUrl, galleryUrls };
        setProduct(finalProduct);
        setSelectedImage(mainImgUrl);
      } catch (error) {
//         console.error("Failed to fetch product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  // ===============================
  // ORIENTATION LOGIC (SDE-2 Best Fit)
  // ===============================
  const displayImage = useMemo(
    () => selectedImage || product?.mainImgUrl,
    [selectedImage, product?.mainImgUrl]
  );

  useEffect(() => {
    if (!displayImage) return;

    const img = new Image();
    img.src = displayImage;
    img.onload = () => {
      // Check if the painting is wide or tall
      setIsLandscape(img.naturalWidth >= img.naturalHeight);
    };
  }, [displayImage]);

  // ===============================
  // MEMOIZED CALCULATIONS
  // ===============================
  const calculateMRP = useCallback((price, discountPercent) => {
    if (!price) return 0;
    if (!discountPercent || discountPercent <= 0) return price;
    return Math.round(price - (price * discountPercent) / 100);
  }, []);

  const allImages = useMemo(() => {
    if (!product) return [];
    return [product.mainImgUrl, ...(product.galleryUrls || [])];
  }, [product]);

  const mrpINR = useMemo(() => calculateMRP(product?.pricein, product?.discountin), [product, calculateMRP]);
  const mrpUSD = useMemo(() => calculateMRP(product?.priceusd, product?.discountusd), [product, calculateMRP]);

  const discountINR = useMemo(() => Math.max(0, (product?.pricein || 0) - mrpINR), [product?.pricein, mrpINR]);
  const discountUSD = useMemo(() => Math.max(0, (product?.priceusd || 0) - mrpUSD), [product?.priceusd, mrpUSD]);

  // ===============================
  // HANDLERS
  // ===============================
  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (!authStatus) {
      setShowLoginModal(true);
      return;
    }
    dispatch(addToCart(product));
    alert('Added to cart!');
  }, [product, authStatus, dispatch]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    if (!authStatus) {
      setShowLoginModal(true);
      return;
    }
    dispatch(addToCart(product));
    navigate('/checkout');
  }, [product, authStatus, dispatch, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-charcoal" />
      </div>
    );
  }

  if (!product) return <div className="min-h-screen flex items-center justify-center">Artwork not found.</div>;

  return (
    <div className="bg-[#F9F7F2] min-h-screen font-serif relative">
      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* LEFT SIDE: The Art Display */}
          <div className="space-y-6">
            <div className="lg:max-w-[640px] mx-auto h-[62vh] lg:h-[60vh] bg-white/80 border border-[#E8E4DE] rounded-3xl shadow-sm flex items-center justify-center p-4 lg:p-6 overflow-hidden">
              <div className="flex items-center justify-center relative w-full h-full overflow-hidden">
                <OptimizedImage
                  src={displayImage}
                  alt={product.title}
                  className="transition-all duration-500 ease-in-out"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                  containerClassName="w-full h-full"
                  priority={true}
                />
              </div>
            </div>

            {/* THUMBNAILS */}
            {allImages.length > 1 && (
              <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide px-1">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img)}
                    className={`border-2 p-1 w-20 h-20 flex-shrink-0 rounded-lg transition-all duration-300 ${
                      selectedImage === img 
                        ? 'border-black scale-105 shadow-md' 
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} loading="lazy" className="w-full h-full object-cover rounded-md" alt="thumb" />
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowARModal(true)}
              className="w-full py-4 rounded-full border border-black hover:bg-black hover:text-white transition-all uppercase tracking-widest text-xs font-bold shadow-sm"
            >
              View in Room
            </button>
          </div>
          
          {/* RIGHT SIDE: Product Info */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-charcoal">{product.title}</h1>

            {/* Price Display */}
            <div className="flex items-start justify-between gap-6 flex-nowrap overflow-x-auto bg-white/90 rounded-3xl px-5 py-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold text-charcoal">₹{mrpINR?.toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  {product.discountin > 0 ? (
                    <>
                      <span className="line-through text-gray-400">₹{product.pricein?.toLocaleString()}</span>
                      <span className="text-emerald-600 font-semibold">{product.discountin}% OFF</span>
                    </>
                  ) : (
                    <span className="text-gray-400">INR price</span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 text-right">
                <div className="text-xl font-bold text-charcoal">${mrpUSD?.toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-sm text-gray-500">
                  {product.discountusd > 0 ? (
                    <>
                      <span className="line-through text-gray-400">${product.priceusd?.toLocaleString()}</span>
                      <span className="text-emerald-600 font-semibold">{product.discountusd}% OFF</span>
                    </>
                  ) : (
                    <span className="text-gray-400">USD price</span>
                  )}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              {product.isSold ? (
                <button disabled className="w-full py-4 bg-gray-200 text-gray-400 cursor-not-allowed rounded-xl font-bold uppercase tracking-widest">
                  Sold Out
                </button>
              ) : (
                <>
                  <button onClick={handleAddToCart} className="flex-1 py-4 bg-black text-white hover:bg-gray-800 transition flex items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-widest text-xs">
                    <ShoppingCart size={18} /> Add to Cart
                  </button>
                  <button onClick={handleBuyNow} className="flex-1 py-4 border-2 border-black hover:bg-black hover:text-white transition flex items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-widest text-xs">
                    <CreditCard size={18} /> Buy Now
                  </button>
                </>
              )}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm border-t pt-8">
              <div>
                <p className="text-gray-400 uppercase tracking-tighter text-[10px] font-bold">Dimensions</p>
                <p className="font-medium">{product.width}" x {product.height}"</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-tighter text-[10px] font-bold">Medium</p>
                <p className="font-medium">{product.medium}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-tighter text-[10px] font-bold">Style</p>
                <p className="font-medium">{product.style}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase tracking-tighter text-[10px] font-bold">Subject</p>
                <p className="font-medium">{product.category}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <div className="flex space-x-8 border-b border-gray-200">
                <button onClick={() => setActiveTab('details')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'details' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Description</button>
                <button onClick={() => setActiveTab('shipping')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'shipping' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Shipping</button>
              </div>
              <div className="mt-6 text-gray-600 text-sm leading-relaxed italic">
                {activeTab === 'details' ? <p>{product.description}</p> : <p>Safe and insured museum-grade global delivery in custom packaging. Ships within 7-10 business days.</p>}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white max-w-sm w-full p-10 rounded-3xl shadow-2xl text-center">
            <LogIn className="mx-auto mb-6 text-black" size={40} />
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Login Required</h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">Join Adhunic Art to start collecting original masterpieces.</p>
            <button onClick={() => navigate('/login')} className="w-full py-4 bg-black text-white font-bold rounded-full mb-3 uppercase tracking-widest text-xs">Sign In</button>
            <button onClick={() => setShowLoginModal(false)} className="w-full py-2 text-gray-400 text-xs font-bold hover:text-black">Dismiss</button>
          </div>
        </div>
      )}

      {/* AR MODAL */}
      {showARModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative w-full max-w-5xl h-full sm:h-[85vh] bg-white rounded-none sm:rounded-3xl overflow-hidden shadow-2xl">
            <button onClick={() => setShowARModal(false)} className="absolute top-6 right-6 z-50 p-3 bg-white/80 hover:bg-white rounded-full text-black shadow-lg"><X size={24}/></button>
            <img src={roomBackground} className="absolute inset-0 w-full h-full object-cover" alt="Room view" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[20%] h-[20%] flex items-center justify-center">
                <img src={selectedImage || product.mainImgUrl} className="w-full h-full object-contain" alt="Scale Preview" />
              </div>
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 tracking-[0.4em] font-bold uppercase">Virtual Gallery Scale</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductDetails);
