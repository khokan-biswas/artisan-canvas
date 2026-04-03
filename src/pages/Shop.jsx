import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchFilteredPaintings } from '../store/shopSlice';
import authService from '../backend/auth'; // ✅ Imported Auth Service
import { Loader2, ChevronDown, ChevronUp, ChevronRight, SearchX, XCircle } from 'lucide-react';

import ProductCard from '../components/ProductCard.jsx';

// --- Helper Component: Collapsible Filter Section ---
const FilterSection = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));
    return (
        <div className="border-b border-gray-200 py-4">
            <button
                className="flex items-center justify-between w-full text-left mb-2 focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-sm font-medium text-charcoal">{title}</h3>
                {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </button>
            {isOpen && <div className="space-y-2 mt-2">{children}</div>}
        </div>
    );
};

// --- Helper Component: Single Checkbox Option ---
const FilterCheckbox = ({ label, value, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer group text-xs">
        <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-charcoal focus:ring-charcoal transition"
            checked={checked}
            onChange={() => onChange(value)}
        />
        <span className="text-xs text-gray-600 group-hover:text-charcoal transition">{label}</span>
    </label>
);

const Shop = () => {
    const dispatch = useDispatch();
    const shopState = useSelector((state) => state.shop.shopPage);
    const items = shopState?.items || [];
    const total = shopState?.total || 0;
    const loading = shopState?.loading;

    // --- Local State ---
    const [filters, setFilters] = useState({
        medium: [],
        subject: [],
        style: [],
        priceRange: [0, 10000],
    });

    const [sort, setSort] = useState('newest');
    const [userCountry, setUserCountry] = useState(''); // ✅ Store User Country
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [priceInputs, setPriceInputs] = useState({ min: 0, max: 10000 });

    // --- 1. Fetch User Country on Mount ---
    useEffect(() => {
        const getUserContext = async () => {
            try {
                const user = await authService.getCurrentUser();
                if (user && user.country) {
                    setUserCountry(user.country);
                }
            } catch (error) {
//                 console.log("Guest User - defaulting to USD");
            }
        };
        getUserContext();
    }, []);

    // --- 2. Helper: Dynamic Sort Query ---
    const getSortQuery = () => {
        if (sort === 'newest') return 'newest';

        // 🌍 Select Column: If India -> 'pricein', else -> 'priceusd'
        const priceColumn = userCountry === 'India' ? 'pricein' : 'priceusd';

        if (sort === 'price-low-high') return `${priceColumn}-asc`;
        if (sort === 'price-high-low') return `${priceColumn}-desc`;

        return sort;
    };

    // --- 3. Fetch Data Effect ---
    useEffect(() => {
        const offset = (currentPage - 1) * itemsPerPage;

        // Dispatch with the CALCULATED sort query
        dispatch(fetchFilteredPaintings({
            filters,
            sort: getSortQuery(), // ✅ Uses dynamic column
            offset,
            limit: itemsPerPage
        }));

        window.scrollTo(0, 0);
    }, [dispatch, filters, sort, currentPage, userCountry]); // Re-run when country loads

    // --- Handlers ---
    const handleCheckboxChange = (category, value) => {
        setFilters((prev) => {
            const newCategoryValues = prev[category].includes(value)
                ? prev[category].filter((item) => item !== value)
                : [...prev[category], value];
            return { ...prev, [category]: newCategoryValues };
        });
        setCurrentPage(1);
    };

    const handlePriceApply = () => {
        setFilters((prev) => ({
            ...prev,
            priceRange: [Number(priceInputs.min) || 0, Number(priceInputs.max) || 10000],
        }));
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            medium: [],
            subject: [],
            style: [],
            priceRange: [0, 10000],
        });
        setPriceInputs({ min: 0, max: 10000 });
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(total / itemsPerPage);

    return (
        <div className="bg-[#FDFBF7] min-h-screen font-sans text-charcoal">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Breadcrumbs */}
                <div className="flex items-center text-sm text-gray-500 mb-4 space-x-2">
                    <Link to="/" className="hover:text-charcoal transition">Home</Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-charcoal font-medium">Shop All</span>
                </div>

                <h1 className="text-4xl font-serif font-bold mb-10">Shop All</h1>

                {/* Mobile Filters - keep all filters visible for phone users */}
                <div className="lg:hidden bg-white rounded-3xl shadow-sm p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-charcoal">Filters</h2>
                            <p className="text-xs text-gray-500">Choose your art preferences</p>
                        </div>
                        <button onClick={handleClearFilters} className="text-xs font-semibold uppercase tracking-wider text-charcoal hover:text-black">
                            Clear
                        </button>
                    </div>

                    <FilterSection title="Medium">
                        {['Oil', 'Acrylic', 'Watercolor'].map((item) => (
                            <FilterCheckbox
                                key={item}
                                label={item}
                                value={item}
                                checked={filters.medium.includes(item)}
                                onChange={(val) => handleCheckboxChange('medium', val)}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="CATEGORIES">
                        {[
                            'Landscape',
                            'Portrait',
                            'Abstract',
                            'Still Life',
                            'Spiritual',
                            'Contemporary',
                            'Wildlife',
                            'Seascape',
                            'Urban',
                            'Figurative',
                            'Minimalist',
                            'Surrealism',
                            'Mythological',
                            'Tribal',
                            'Calligraphy',
                            'Botanical'
                        ].map((item) => (
                            <FilterCheckbox
                                key={item}
                                label={item}
                                value={item}
                                checked={filters.subject.includes(item)}
                                onChange={(val) => handleCheckboxChange('subject', val)}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Style">
                        {['Modern', 'Traditional', 'Impressionist'].map((item) => (
                            <FilterCheckbox
                                key={item}
                                label={item}
                                value={item}
                                checked={filters.style.includes(item)}
                                onChange={(val) => handleCheckboxChange('style', val)}
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Price">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                <input
                                    type="number"
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-charcoal focus:ring-0 outline-none bg-white"
                                    placeholder="Min"
                                    value={priceInputs.min}
                                    onChange={(e) => setPriceInputs({ ...priceInputs, min: e.target.value })}
                                />
                            </div>
                            <span className="text-gray-500">-</span>
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                <input
                                    type="number"
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-charcoal focus:ring-0 outline-none bg-white"
                                    placeholder="Max"
                                    value={priceInputs.max}
                                    onChange={(e) => setPriceInputs({ ...priceInputs, max: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handlePriceApply}
                            className="w-full bg-charcoal text-white py-2 rounded-sm text-sm font-medium hover:bg-gray-800 transition"
                        >
                            Apply
                        </button>
                    </FilterSection>
                </div>

                <div className="lg:grid lg:grid-cols-4 lg:gap-x-12">

                    {/* --- LEFT SIDEBAR: FILTERS --- */}
                    <aside className="hidden lg:block space-y-1">
                        {/* Medium Filter */}
                        <FilterSection title="Medium">
                            {['Oil', 'Acrylic', 'Watercolor'].map((item) => (
                                <FilterCheckbox
                                    key={item}
                                    label={item}
                                    value={item}
                                    checked={filters.medium.includes(item)}
                                    onChange={(val) => handleCheckboxChange('medium', val)}
                                />
                            ))}
                        </FilterSection>

                        {/* Subject Filter */}
                        <FilterSection title="CATEGORIES">
                            {[
                                "Landscape",
                                "Portrait",
                                "Abstract",
                                "Still Life",
                                "Spiritual",
                                "Contemporary",
                                "Wildlife",
                                "Seascape",
                                "Urban",
                                "Figurative",
                                "Minimalist",
                                "Surrealism",
                                "Mythological",
                                "Tribal",
                                "Calligraphy",
                                "Botanical"
                            ].map((item) => (
                                <FilterCheckbox
                                    key={item}
                                    label={item}
                                    value={item}
                                    checked={filters.subject.includes(item)}
                                    onChange={(val) => handleCheckboxChange('subject', val)}
                                />
                            ))}
                        </FilterSection>

                        {/* Style Filter */}
                        <FilterSection title="Style">
                            {['Modern', 'Traditional', 'Impressionist'].map((item) => (
                                <FilterCheckbox
                                    key={item}
                                    label={item}
                                    value={item}
                                    checked={filters.style.includes(item)}
                                    onChange={(val) => handleCheckboxChange('style', val)}
                                />
                            ))}
                        </FilterSection>

                        {/* Price Filter */}
                        <FilterSection title="Price">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="relative w-full">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-charcoal focus:ring-0 outline-none bg-white"
                                        placeholder="Min"
                                        value={priceInputs.min}
                                        onChange={(e) => setPriceInputs({ ...priceInputs, min: e.target.value })}
                                    />
                                </div>
                                <span className="text-gray-500">-</span>
                                <div className="relative w-full">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-sm text-sm focus:border-charcoal focus:ring-0 outline-none bg-white"
                                        placeholder="Max"
                                        value={priceInputs.max}
                                        onChange={(e) => setPriceInputs({ ...priceInputs, max: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handlePriceApply}
                                className="w-full bg-charcoal text-white py-2 rounded-sm text-sm font-medium hover:bg-gray-800 transition"
                            >
                                Apply
                            </button>
                        </FilterSection>
                    </aside>

                    {/* --- RIGHT COLUMN: PRODUCT GRID --- */}
                    <main className="mt-8 lg:mt-0 lg:col-span-3">

                        {/* Sorting & Results Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-200">
                            <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                                Showing {items.length} of {total} results
                                {/* ✅ Active Sort Indicator */}
                                {sort !== 'newest' && (
                                    <span className="ml-2 text-xs font-medium text-charcoal bg-gray-100 px-2 py-1 rounded">
                                        Sorted by {userCountry === 'India' ? 'INR (₹)' : 'USD ($)'}
                                    </span>
                                )}
                            </p>

                            <div className="flex items-center">
                                <label htmlFor="sort" className="text-sm text-gray-600 mr-3">Sort by:</label>
                                <div className="relative">
                                    <select
                                        id="sort"
                                        className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-sm text-sm focus:border-charcoal focus:ring-0 outline-none bg-white cursor-pointer"
                                        value={sort}
                                        onChange={(e) => {
                                            setSort(e.target.value);
                                            setCurrentPage(1); // ✅ Reset to Page 1
                                        }}
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="price-low-high">Price: Low to High</option>
                                        <option value="price-high-low">Price: High to Low</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="py-32 flex justify-center">
                                <Loader2 className="animate-spin h-12 w-12 text-charcoal" />
                            </div>
                        )}

                        {/* --- EMPTY STATE UI --- */}
                        {!loading && items.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center bg-white border border-gray-100 rounded-sm p-8">
                                <div className="bg-gray-50 p-6 rounded-full mb-6">
                                    <SearchX className="h-12 w-12 text-gray-400" />
                                </div>
                                <h2 className="text-2xl font-serif text-charcoal mb-3">No masterpieces found</h2>
                                <p className="text-gray-500 max-w-md mb-8">
                                    We couldn't find any art matching your current filters. Try adjusting your search criteria or browse our full collection.
                                </p>
                                <button
                                    onClick={handleClearFilters}
                                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-sm text-charcoal font-medium hover:bg-gray-50 transition"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Clear All Filters
                                </button>
                            </div>
                        )}

                        {/* Product Grid */}
                        {!loading && items.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
                                {items.map((painting) => (
                                    <ProductCard key={painting.$id} painting={painting} />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="mt-16 flex justify-center space-x-2">
                                {/* Previous Button */}
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <ChevronRight className="h-5 w-5 rotate-180" />
                                </button>

                                {/* Page Numbers */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 text-sm font-medium rounded-sm transition ${currentPage === page
                                            ? 'bg-charcoal text-white border border-charcoal'
                                            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                {/* Next Button */}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 border border-gray-300 rounded-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Shop;
