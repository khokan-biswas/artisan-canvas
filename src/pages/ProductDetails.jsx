import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux'; // Added useSelector
import { addToCart } from '../store/cartSlice';
import service from '../backend/config.js';
import { ShoppingCart, CreditCard, Loader2, X, Eye, LogIn } from 'lucide-react';
import roomBackground from '../assets/istockphoto-1311768804-612x612.jpg';

const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get auth status from Redux
  const authStatus = useSelector((state) => state.auth.status);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showARModal, setShowARModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); // Modal state
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

        const finalProduct = {
          ...data,
          mainImgUrl,
          galleryUrls
        };

        setProduct(finalProduct);
        setSelectedImage(mainImgUrl);
      } catch (error) {
        console.error("Failed to fetch product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // ===============================
  // IMAGE ORIENTATION CHECK
  // ===============================
  useEffect(() => {
    if (!selectedImage) return;
    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      setIsLandscape(img.width >= img.height);
    };
  }, [selectedImage]);

  const calculateMRP = (price, discountPercent) => {
    if (!discountPercent || discountPercent <= 0) return price;
    return Math.round(price - (price * discountPercent) / 100);
  };

  // ===============================
  // AUTH GUARD LOGIC
  // ===============================
  const handleAddToCart = () => {
    if (!product) return;
    if (!authStatus) {
      setShowLoginModal(true);
      return;
    }
    dispatch(addToCart(product));
    alert("Added to cart!");
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!authStatus) {
      setShowLoginModal(true);
      return;
    }
    dispatch(addToCart(product));
    navigate('/checkout');
  };

  // ===============================
  // UI STATES
  // ===============================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-charcoal" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Artwork not found.
      </div>
    );
  }

  const allImages = [product.mainImgUrl, ...product.galleryUrls];
  const mrpINR = calculateMRP(product.pricein, product.discountin);

  return (
    <div className="bg-[#F9F7F2] min-h-screen font-serif relative">
      <main className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={selectedImage}
                alt={product.title}
                className={`
                   ${isLandscape ? 'w-full h-auto max-h-full' : 'h-full w-auto max-w-full'} 
                   object-contain 
                   shadow-lg 
                   transition-all 
                   duration-500 
                   ease-in-out
                  `}
               />
            </div>

            {allImages.length > 1 && (
              <div className="flex space-x-4 overflow-x-auto">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img)}
                    className={`border-2 p-1 w-20 h-20 flex-shrink-0 ${selectedImage === img ? 'border-black' : 'border-transparent'
                      }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowARModal(true)}
              className="w-full py-3 border border-black hover:bg-black hover:text-white transition uppercase tracking-widest text-sm"
            >
              View in Room
            </button>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <div>
              <p className="text-2xl font-bold">₹{mrpINR?.toLocaleString()}</p>
              {product.discountin > 0 && (
                <p className="line-through text-gray-400">
                  ₹{product.pricein?.toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              {product.isSold ? (
                <button disabled className="w-full py-3 bg-gray-300 cursor-not-allowed">
                  SOLD OUT
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3 bg-black text-white hover:bg-gray-800 transition flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} /> Add to Cart
                  </button>

                  <button
                    onClick={handleBuyNow}
                    className="flex-1 py-3 border border-black hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <CreditCard size={18} /> Buy Now
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm border-t pt-6">
              <p><b>Dimensions:</b> {product.width}" x {product.height}"</p>
              <p><b>Medium:</b> {product.medium}</p>
              <p><b>Style:</b> {product.style}</p>
              <p><b>Subject:</b> {product.category}</p>
            </div>

            <div className="mt-4">
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`mr-4 pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'details' ? 'border-b-2 border-black' : 'text-gray-400'}`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'shipping' ? 'border-b-2 border-black' : 'text-gray-400'}`}
                >
                  Shipping
                </button>
              </div>

              <div className="mt-4 text-gray-600 leading-relaxed">
                {activeTab === 'details' && <p>{product.description}</p>}
                {activeTab === 'shipping' && (
                  <p>Insured delivery in 5-7 business days. Artwork is professionally packed in custom wooden crates.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* LOGIN PROMPT MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="text-black" size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600 mb-8">
              You are not able to perform this action. If you want to continue, please login to your account.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition"
              >
                Yes, Go to Login
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-3 border border-gray-300 text-gray-500 font-bold uppercase tracking-widest text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM MODAL */}
      {showARModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="relative w-full max-w-4xl h-[80vh] bg-white">
            <button
              onClick={() => setShowARModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full"
            >
              <X />
            </button>
            <img
              src={roomBackground}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Room view"
            />
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 border-[12px] border-black p-2 bg-white shadow-2xl">
              <img
                src={selectedImage}
                className="max-h-[240px] object-contain"
                alt="Artwork Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;