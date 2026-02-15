import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import service from '../backend/config.js';
import authService from '../backend/auth'; 
import { ShoppingCart, CreditCard, Loader2, X, Eye } from 'lucide-react';

// --- 1. IMPORT YOUR LOCAL IMAGE ---
import roomBackground from '../assets/istockphoto-1311768804-612x612.jpg';

const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showARModal, setShowARModal] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  
  // State to store current user status
  const [currentUser, setCurrentUser] = useState(null);

  // FETCH DATA & USER STATUS
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch User Status
        try {
            const user = await authService.getCurrentUser();
            setCurrentUser(user);
        } catch (err) {
            // User is guest
            setCurrentUser(null);
        }

        // 2. Fetch Product
        if (!slug) return;
        const data = await service.getPainting(slug);

        if (data) {
          const mainImgUrl = service.getThumbnail(data.imageUrl);
          const galleryUrls = (data.gallery || []).map(idOrUrl =>
            service.getThumbnail(idOrUrl)
          );

          setProduct({ ...data, mainImgUrl, galleryUrls });
          setSelectedImage(mainImgUrl);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  // Handle Image Orientation for Smart Fitting
  useEffect(() => {
    if (selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        setIsLandscape(img.width >= img.height);
      };
    }
  }, [selectedImage]);

  const calculateMRP = (price, discountPercent) => {
    if (!discountPercent || discountPercent <= 0) return price;
    const discountedPrice = price - (price * (discountPercent / 100));
    return Math.round(discountedPrice);
  };

  // --- 🔒 AUTHENTICATION CHECK HELPER (FIXED) ---
  const checkAuth = () => {
    if (!currentUser) {
        // Show Popup
        const userWantsToLogin = window.confirm("You cannot perform this without logging in.\n\nDo you want to log in or create an account?");
        
        // If they clicked "OK" (Yes)
        if (userWantsToLogin) {
            navigate('/login');
        }
        
        // Return false to block the action (Cart/Buy)
        return false;
    }
    // Return true if user IS logged in
    return true;
  };

  const handleAddToCart = () => {
    if (!checkAuth()) return; // 🛑 Stop if not logged in

    if (product) {
      dispatch(addToCart(product));
      alert("Added to cart!");
    }
  };

  const handleBuyNow = () => {
    if (!checkAuth()) return; // 🛑 Stop if not logged in

    if (product) {
      dispatch(addToCart(product));
      navigate('/checkout');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-charcoal" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">Artwork not found.</div>;

  const allImages = [product.mainImgUrl, ...product.galleryUrls];
  const mrpINR = calculateMRP(product.pricein, product.discountin);
  const mrpUSD = calculateMRP(product.priceusd, product.discountusd);

  return (
    <div className="bg-[#F9F7F2] min-h-screen font-serif relative">

      <main className="container mx-auto px-4 py-10">
        <div className="text-sm text-gray-500 mb-8">Home &gt; Artists &gt; {product.artist} &gt; {product.title}</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* LEFT: IMAGES */}
          <div className="space-y-6">
            {/* Main Smart Box */}
            <div className="bg-white p-4 shadow-sm border border-[#EBE7DE] aspect-[4/3] flex items-center justify-center bg-gray-50 overflow-hidden relative">
              <img
                src={selectedImage}
                alt={product.title}
                className={`block shadow-md transition-all duration-300 ${isLandscape ? 'w-full h-auto' : 'h-full w-auto'}`}
              />
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button key={index} onClick={() => setSelectedImage(img)} className={`border-2 p-1 w-20 h-20 flex-shrink-0 bg-white ${selectedImage === img ? 'border-charcoal' : 'border-transparent'}`}>
                    <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowARModal(true)}
              className="flex items-center justify-center space-x-2 w-full py-3 border border-charcoal text-charcoal font-medium hover:bg-charcoal hover:text-white transition"
            >
              <Eye size={20} />
              <span>View in Room (AR)</span>
            </button>
          </div>

          {/* RIGHT: INFO */}
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-charcoal">{product.title}</h1>

            <div className="space-y-2 border-b border-[#EBE7DE] pb-6">
              <div className="flex items-center space-x-3 text-lg">
                <span className="font-bold text-charcoal text-2xl">₹{mrpINR?.toLocaleString()}</span>
                {product.discountin > 0 && (
                  <>
                    <span className="line-through text-gray-400">₹{product.pricein?.toLocaleString()}</span>
                    <span className="text-green-700 bg-green-100 px-2 py-0.5 text-sm font-bold rounded">{product.discountin}% OFF</span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-3 text-base text-gray-600">
                <span className="font-semibold">${mrpUSD?.toLocaleString()}</span>
                {product.discountusd > 0 && (
                  <>
                    <span className="line-through text-gray-400 text-sm">${product.priceusd?.toLocaleString()}</span>
                    <span className="text-green-700 text-xs font-bold">{product.discountusd}% OFF</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-4">
              {product.isSold ? (
                <button disabled className="w-full py-4 bg-gray-300 text-gray-500 font-bold cursor-not-allowed">SOLD OUT</button>
              ) : (
                <>
                  <button onClick={handleAddToCart} className="flex-1 flex items-center justify-center space-x-2 py-3 bg-charcoal text-white font-medium hover:bg-opacity-90 transition">
                    <ShoppingCart size={20} /><span>Add to Cart</span>
                  </button>
                  <button onClick={handleBuyNow} className="flex-1 flex items-center justify-center space-x-2 py-3 bg-white border border-charcoal text-charcoal font-medium hover:bg-gray-50 transition">
                    <CreditCard size={20} /><span>Buy Now</span>
                  </button>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700 py-4 font-sans">
              <p><span className="font-bold text-charcoal">Dimensions:</span> {product.width}" x {product.height}"</p>
              <p><span className="font-bold text-charcoal">Medium:</span> {product.medium}</p>
              <p><span className="font-bold text-charcoal">Style:</span> {product.style}</p>
              <p><span className="font-bold text-charcoal">Subject:</span> {product.category}</p>
              <p className="col-span-2"><span className="font-bold text-charcoal">Frame:</span> {product.frameStatus}</p>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white border border-[#EBE7DE] rounded-sm">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">🎨</div>
              <div>
                <h3 className="font-bold text-charcoal">{product.artist}</h3>
                <p className="text-sm text-gray-500">Verified Artist on Artisan Canvas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-16">
          <div className="flex border-b border-[#EBE7DE] space-x-8">
            <button className={`pb-4 text-lg font-medium ${activeTab === 'details' ? 'text-charcoal border-b-2 border-charcoal' : 'text-gray-500'}`} onClick={() => setActiveTab('details')}>Description</button>
            <button className={`pb-4 text-lg font-medium ${activeTab === 'shipping' ? 'text-charcoal border-b-2 border-charcoal' : 'text-gray-500'}`} onClick={() => setActiveTab('shipping')}>Shipping Info</button>
          </div>
          <div className="py-8 text-gray-700 leading-relaxed max-w-3xl">
            {activeTab === 'details' && <p>{product.description}</p>}
            {activeTab === 'shipping' && <div><p>Paintings are carefully rolled in hard PVC pipes. Delivery usually takes 5-7 business days.</p></div>}
          </div>
        </div>
      </main>

      {/* --- ROOM VIEW MODAL (USING LOCAL ISTOCK IMAGE) --- */}
      {showARModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white w-full max-w-6xl h-[90vh] rounded-none overflow-hidden shadow-2xl flex flex-col">

            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
              <h3 className="text-white font-bold text-lg drop-shadow-md tracking-wider uppercase">Living Room Visualization</h3>
              <button onClick={() => setShowARModal(false)} className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-md transition">
                <X size={20} />
              </button>
            </div>

            <div className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden">

              {/* --- 2. THE LOCAL ROOM IMAGE --- */}
              <img
                src={roomBackground}
                alt="Living Room Visualization"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* --- 3. DYNAMIC FRAMED PAINTING (STRICT SIZING) --- */}
              <div
                className="absolute top-[18%] left-1/2 -translate-x-1/2 z-10 shadow-[0_30px_60px_rgba(0,0,0,0.7)] transform hover:scale-105 transition-all duration-500 cursor-move"
                style={{
                  maxWidth: '350px',
                  maxHeight: '280px',
                  width: 'auto',
                  height: 'auto',
                  border: '12px solid #111',
                  backgroundColor: '#fff',
                  padding: '10px',
                  outline: '1px solid #444',
                  boxSizing: 'border-box'
                }}
              >
                <img
                  src={selectedImage}
                  alt="Framed Painting"
                  className="block w-full h-full object-contain"
                  style={{
                    maxHeight: '240px' 
                  }}
                />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/canvas-orange.png')] opacity-10 pointer-events-none"></div>
              </div>
            </div>

            <div className="bg-black text-gray-400 p-4 text-center text-[10px] tracking-widest uppercase">
              Simulation for visualization. Actual painting size is {product.width}" x {product.height}".
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetails;