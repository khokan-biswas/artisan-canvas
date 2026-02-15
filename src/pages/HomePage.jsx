import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchCategoryPaintings } from '../store/shopSlice';
import { Loader2, ArrowRight } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import service from '../backend/config';

// ⚠️ Ensure this image exists in your assets folder, or change the path
import HERO_IMAGE_URL from '../assets/Gemini_Generated_Image_ys2ex3ys2ex3ys2e.png';

// 1. Define the categories
const CATEGORIES = [
  'Landscape', 'Still Life', 'Cloudscape', 
  'Abstract', 'Flora', 'Expressionism', 
  'Folk Art', 'Tribal Art', 'Digital Art', 
  'Portrait', 'Woman', 'Pop Art', 
  'Miniature', 'Misc'
];

// 2. Section Row Component
const SectionRow = ({ title, linkTo, paintings, loading, id }) => {
  // Loading State
  if (loading) return (
      <section id={id} className="py-12 flex justify-center border-b border-gray-100 min-h-[300px]">
        <Loader2 className="animate-spin h-8 w-8 text-charcoal" />
      </section>
  );

  // If no paintings (or all are sold), hide this section entirely
  if (!paintings || paintings.length === 0) return null;

  return (
    <section id={id} className="py-12 border-b border-gray-100 last:border-0 scroll-mt-24">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 px-2">
        <h2 className="text-2xl md:text-3xl font-serif text-charcoal capitalize">{title}</h2>
        <Link 
            to={linkTo} 
            className="group flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-charcoal transition"
        >
          View All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
        </Link>
      </div>

      {/* Grid - Strictly 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {paintings.slice(0, 5).map((painting) => (
          <div key={painting.$id} className="w-full h-full">
             <ProductCard painting={painting} />
          </div>
        ))}
      </div>
    </section>
  );
};

const HomePage = () => {
  const dispatch = useDispatch();
  
  // Access the categories state from Redux
  const categoriesState = useSelector((state) => state.shop.categories);

  // 3. Fetch data for ALL categories
  useEffect(() => {
    CATEGORIES.forEach(cat => {
        // We dispatch the action to fetch unsold items for each category
        dispatch(fetchCategoryPaintings({ category: cat, offset: 0 }));
    });
  }, [dispatch]);

  // 4. Scroll Handler for the Sticky Bar
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#FDFBF7] min-h-screen">
      
      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden bg-charcoal">
        <img
          src={HERO_IMAGE_URL}
          // fallback in case image is missing
          onError={(e) => e.target.style.display = 'none'} 
          alt="Gallery Interior"
          className="w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 drop-shadow-xl tracking-wide">
                Curated Excellence
            </h1>
            <Link to="/shop" className="bg-white text-charcoal px-8 py-3 font-medium text-sm tracking-widest hover:bg-gray-100 transition rounded-sm shadow-lg">
                EXPLORE ALL
            </Link>
        </div>
      </div>

      {/* --- STICKY CATEGORY NAV --- */}
      <div className="sticky top-16 z-30 bg-[#FDFBF7]/95 backdrop-blur-sm border-b border-gray-200 shadow-sm py-4">
        <div className="max-w-[1400px] mx-auto px-4 overflow-x-auto no-scrollbar">
            <div className="flex space-x-4 min-w-max">
              {CATEGORIES.map((cat) => {
                const catData = categoriesState[cat] || { items: [] };
                // Use the first painting's image as the category thumbnail
                const thumbId = catData.items[0]?.imageUrl;
                const thumbUrl = thumbId ? service.getThumbnail(thumbId) : null;

                return (
                  <button
                    key={cat}
                    onClick={() => scrollToSection(cat)}
                    className="flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div className="w-28 h-16 border border-gray-300 rounded-md flex items-center justify-center bg-white hover:border-charcoal hover:shadow-md transition-all duration-300 relative overflow-hidden">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={cat} className="w-full h-full object-cover object-center" />
                      ) : (
                        <span className="text-xs font-serif font-bold text-gray-400 group-hover:text-charcoal uppercase tracking-widest z-10">
                          {cat.split(' ')[0]}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-20 transition-opacity" />
                    </div>
                    <span className="mt-2 text-xs font-medium text-gray-500 group-hover:text-charcoal uppercase tracking-wide">
                      {cat}
                    </span>
                  </button>
                );
              })}
            </div>
        </div>
      </div>

      {/* --- MAIN CATEGORY ROWS --- */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {CATEGORIES.map((category) => {
            const categoryData = categoriesState[category] || { items: [], loading: true };
            
            return (
                <SectionRow 
                    key={category}
                    id={category} 
                    title={category} 
                    linkTo={`/shop?category=${category}`} 
                    paintings={categoryData.items} 
                    loading={categoryData.loading} 
                />
            );
        })}
      </div>

    </div>
  );
};

export default HomePage;