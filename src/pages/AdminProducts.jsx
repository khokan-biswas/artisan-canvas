import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import service from '../backend/config';
import OptimizedImage from '../components/OptimizedImage';
import { LayoutDashboard, Package, ShoppingCart, Users, Palette, Search, ChevronDown, Plus, Edit, Tag } from 'lucide-react';

// ... (Keep SidebarItem and StatusBadge components) ...
const SidebarItem = ({ icon: Icon, label, to = "#", active }) => (
    <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200 group ${active ? 'bg-[#EAE5D8] text-charcoal font-medium' : 'text-gray-500 hover:bg-[#F5F2EB] hover:text-charcoal'}`}>
        <Icon size={20} className={active ? 'text-charcoal' : 'text-gray-400 group-hover:text-charcoal'} />
        <span>{label}</span>
    </Link>
);

const StatusBadge = ({ status }) => {
    const isAvailable = status === false;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isAvailable ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-200 text-gray-600 border-gray-300"}`}>{isAvailable ? "Available" : "Sold"}</span>;
};

const AdminProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchProductId, setSearchProductId] = useState('');

    // State for Global Discount (USD & INR)
    const [globalDiscountUSD, setGlobalDiscountUSD] = useState('');
    const [globalDiscountINR, setGlobalDiscountINR] = useState('');
    const [applyingDiscount, setApplyingDiscount] = useState(false);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const response = await service.getPaintings([]);
                setProducts(response.documents);
                setFilteredProducts(response.documents);
            } catch (error) {
                //         console.error("Failed to load products", error);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    //   console.log("Products:", products);

    const handleEdit = (product) => {
        navigate('/admin/upload', { state: { product } });
    };

    // Search products by ID
    const handleSearchByProductId = (productId) => {
        setSearchProductId(productId);
        if (!productId.trim()) {
            setFilteredProducts(products);
        } else {
            const searchTerm = productId.trim().toLowerCase();
            // First try exact match
            let filtered = products.filter(p => p.$id.toLowerCase() === searchTerm);

            // If no exact matches, try partial match
            if (filtered.length === 0) {
                filtered = products.filter(p => p.$id.toLowerCase().includes(searchTerm));
            }

            setFilteredProducts(filtered);
        }
    };

    const applyGlobalDiscount = async (currency) => {
        const discount = currency === 'USD' ? globalDiscountUSD : globalDiscountINR;
        const field = currency === 'USD' ? 'discountusd' : 'discountin';

        if (!discount) {
            alert(`Please enter a discount for ${currency}`);
            return;
        }
        if (!window.confirm(`Are you sure you want to apply ${discount}% OFF to ALL products in ${currency}?`)) return;

        setApplyingDiscount(true);
        try {
            const promises = products.map(product =>
                service.updatePainting(product.$id, { [field]: parseInt(discount) })
            );
            await Promise.all(promises);
            alert(`${currency} discount applied successfully!`);
            window.location.reload();
        } catch (error) {
            //             console.error("Error applying discount", error);
            alert("Failed to apply discount");
        } finally {
            setApplyingDiscount(false);
        }
    };

    //     // console.log("this is : ", products);

    return (
        <div className="min-h-screen bg-cream flex font-sans text-charcoal">
            {/* Sidebar (Same as before) */}
            <aside className="w-64 bg-beige-light border-r border-beige-border fixed h-full hidden md:flex flex-col z-20">
                <div className="p-8"><h1 className="text-2xl font-serif text-charcoal">Adhunic Art</h1></div>
                <nav className="flex-1 px-4 space-y-2">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin/dashboard" />
                    <SidebarItem icon={Package} label="Products" active={true} to="/admin/products" />
                    <SidebarItem icon={ShoppingCart} label="Orders" to="/admin/orders" />
                    <SidebarItem icon={Users} label="Customers" to="/admin/customers" />
                    <SidebarItem icon={Palette} label="Upload" to="/admin/upload" />
                </nav>
            </aside>

            <main className="flex-1 md:ml-64 min-h-screen w-full overflow-hidden bg-cream">

                <div className="p-4 md:p-8 pr-6 md:pr-16 max-w-full">

                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <h2 className="text-3xl font-serif text-charcoal">Products</h2>
                        <div className="flex gap-2">
                            <button onClick={() => navigate('/admin/upload')} className="flex items-center gap-2 px-6 py-2 bg-[#4A4A4A] text-white rounded-md text-sm font-medium hover:bg-black transition shadow-sm">
                                <Plus size={16} /> Add New Product
                            </button>
                        </div>
                    </div>

                    {/* Global Discount Section */}
                    <div className="bg-white p-6 rounded-xl border border-[#EBE7DE] mb-8 shadow-sm">
                        <div className="flex items-center gap-2 text-charcoal mb-6">
                            <Tag className="text-gold" />
                            <span className="font-bold text-lg">Global Sale Manager & Search</span>
                        </div>

                        {/* Search Section */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                            <label className="text-sm font-semibold text-charcoal mb-2 block">Search by Product ID (Copied from Orders)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Paste product ID here to search..."
                                    value={searchProductId}
                                    onChange={(e) => handleSearchByProductId(e.target.value)}
                                    onPaste={(e) => {
                                        // Handle paste event to ensure search triggers
                                        const pastedValue = e.clipboardData.getData('text');
                                        setTimeout(() => handleSearchByProductId(pastedValue), 0);
                                    }}
                                    className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                />
                                {searchProductId && (
                                    <button
                                        onClick={() => handleSearchByProductId('')}
                                        className="px-3 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 text-sm"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            {searchProductId && (
                                <p className="mt-2 text-xs text-gray-500">Found: {filteredProducts.length} product(s) | Searching for: "{searchProductId}"</p>
                            )}
                        </div>

                        {/* Discount Section - USD & INR */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* USD Discount */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-3">💵 USD Global Discount</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Enter % Off"
                                            value={globalDiscountUSD}
                                            onChange={(e) => setGlobalDiscountUSD(e.target.value)}
                                            className="w-1/2 border border-blue-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                        <button
                                            onClick={() => applyGlobalDiscount('USD')}
                                            disabled={applyingDiscount || !globalDiscountUSD}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap"
                                        >
                                            {applyingDiscount ? "Applying..." : "Apply USD"}
                                        </button>
                                    </div>
                                </div>

                                {/* INR Discount */}
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <label className="text-xs font-bold text-orange-800 uppercase tracking-wider block mb-3">₹ INR Global Discount</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Enter % Off"
                                            value={globalDiscountINR}
                                            onChange={(e) => setGlobalDiscountINR(e.target.value)}
                                            className="w-1/2 border border-orange-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-400"
                                        />
                                        <button
                                            onClick={() => applyGlobalDiscount('INR')}
                                            disabled={applyingDiscount || !globalDiscountINR}
                                            className="bg-orange-600 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-700 disabled:opacity-50 text-sm whitespace-nowrap"
                                        >
                                            {applyingDiscount ? "Applying..." : "Apply INR"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters Bar & Table (Existing code, just adding Action column) */}
                    <div className="bg-white rounded-xl border border-beige-border shadow-sm overflow-hidden">
                        <div className="md:hidden px-2 py-4 space-y-3 flex flex-col items-center">
                            {loading ? (
                                <div className="py-16 text-center text-gray-500 w-full">Loading...</div>
                            ) : products.length === 0 ? (
                                <div className="py-16 text-center text-gray-500 w-full">No products available.</div>
                            ) : (
                                filteredProducts.map((product) => (
                                    <div key={product.$id} className="rounded-2xl border border-[#E6E0D6] bg-[#FCFBF7] p-3 shadow-sm w-full sm:max-w-xs overflow-hidden">
                                        <div className="flex items-start gap-2">
                                            <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                <OptimizedImage src={service.getThumbnail(product.imageUrl)} alt={product.title} className="h-full w-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-charcoal text-sm truncate">{product.title}</h3>
                                                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{product.category} · {product.style}</p>
                                                    </div>
                                                    <StatusBadge status={product.isSold} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                            <div className="rounded-lg bg-white p-2 border border-[#E6E0D6] overflow-hidden">
                                                <div className="text-[9px] uppercase tracking-wider text-gray-400 truncate">INR</div>
                                                <div className="font-semibold text-charcoal mt-1 text-xs truncate">₹{product.pricein?.toLocaleString()}</div>
                                                <div className="mt-0.5 text-[9px] text-red-500 truncate">{product.discountin > 0 ? `${product.discountin}% OFF` : '-'}</div>
                                            </div>
                                            <div className="rounded-lg bg-white p-2 border border-[#E6E0D6] overflow-hidden">
                                                <div className="text-[9px] uppercase tracking-wider text-gray-400 truncate">USD</div>
                                                <div className="font-semibold text-charcoal mt-1 text-xs truncate">${product.priceusd?.toLocaleString()}</div>
                                                <div className="mt-0.5 text-[9px] text-red-500 truncate">{product.discountusd > 0 ? `${product.discountusd}% OFF` : '-'}</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <div className="text-[10px] text-gray-500 truncate">{product.isFeatured ? 'Featured' : 'Standard'}</div>
                                            <button onClick={() => handleEdit(product)} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-gray-50 transition whitespace-nowrap flex-shrink-0">
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-beige-lighter2 text-charcoal border-b border-beige-border">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold w-16">Image</th>
                                        <th className="px-6 py-4 font-semibold">Product Name</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold">PriceIND</th>
                                        <th className="px-6 py-4 font-semibold">DiscountIND</th>
                                        <th className="px-6 py-4 font-semibold">PriceUSD</th>
                                        <th className="px-6 py-4 font-semibold">DiscountUSD</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-beige-border">
                                    {loading ? <tr><td colSpan="8" className="p-8 text-center">Loading...</td></tr> :
                                        filteredProducts.map((product) => (
                                            <tr key={product.$id} className="hover:bg-cream transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100">
                                                        <OptimizedImage src={service.getThumbnail(product.imageUrl)} alt={product.title} className="h-full w-full object-cover" />
                                                    </div>
                                                </td>

                                                <td className="px-6 py-3">
                                                    <div className="font-medium text-charcoal">{product.title}</div>
                                                </td>
                                                <td className="px-6 py-3"><StatusBadge status={product.isSold} /></td>
                                                <td className="px-6 py-3 font-medium">₹{product.pricein?.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-red-500 font-bold">{product.discountin > 0 ? `${product.discountin}% OFF` : '-'}</td>
                                                <td className="px-6 py-3 font-medium">${product.priceusd?.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-red-500 font-bold">{product.discountusd > 0 ? `${product.discountusd}% OFF` : '-'}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <button onClick={() => handleEdit(product)} className="text-gray-500 hover:text-charcoal p-2 border border-gray-200 rounded-md hover:bg-gray-100 transition">
                                                        <Edit size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
export default AdminProducts;
