import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import service from '../backend/config'; 
import OptimizedImage from '../components/OptimizedImage';
import { LayoutDashboard, Package, ShoppingCart, Users, Palette, Settings, Search, ChevronDown, Plus, Edit, Tag } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Global Discount
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await service.getPaintings([]); 
        setProducts(response.documents);
      } catch (error) {
        console.error("Failed to load products", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  console.log("Products:", products);

  const handleEdit = (product) => {
      navigate('/admin/upload', { state: { product } });
  };

  const applyGlobalDiscount = async () => {
      if(!globalDiscount) return;
      if(!window.confirm(`Are you sure you want to apply ${globalDiscount}% OFF to ALL products?`)) return;

      setApplyingDiscount(true);
      try {
          // Loop through all products and update them (Appwrite Bulk Update workaround)
          const promises = products.map(product => 
              service.updatePainting(product.$id, { discountusd: parseInt(globalDiscount) })
          );
          await Promise.all(promises);
          alert("Discount applied successfully!");
          window.location.reload(); // Refresh to see changes
      } catch (error) {
          console.error("Error applying discount", error);
          alert("Failed to apply discount");
      } finally {
          setApplyingDiscount(false);
      }
  };

  return (
    <div className="min-h-screen bg-cream flex font-sans text-charcoal">
      {/* Sidebar (Same as before) */}
      <aside className="w-64 bg-beige-light border-r border-beige-border fixed h-full hidden md:flex flex-col z-20">
        <div className="p-8"><h1 className="text-2xl font-serif text-charcoal">Artisan Canvas</h1></div>
        <nav className="flex-1 px-4 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin/dashboard" />
            <SidebarItem icon={Package} label="Products" active={true} to="/admin/products" />
            <SidebarItem icon={ShoppingCart} label="Orders" to="/admin/orders" />
            <SidebarItem icon={Users} label="Customers" to="/admin/customers" />
            <SidebarItem icon={Palette} label="Upload" to="/admin/upload" />
            <SidebarItem icon={Settings} label="Settings" to="#" />
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 p-8">
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
        <div className="bg-white p-6 rounded-xl border border-[#EBE7DE] mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-charcoal">
                <Tag className="text-gold" />
                <span className="font-bold">Global Sale Manager</span>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                    type="number" 
                    placeholder="% Off" 
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                    className="border border-gray-300 rounded-md px-4 py-2 w-32 outline-none focus:border-gold"
                />
                <button 
                    onClick={applyGlobalDiscount}
                    disabled={applyingDiscount}
                    className="bg-gold text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-600 disabled:opacity-50"
                >
                    {applyingDiscount ? "Applying..." : "Apply to All"}
                </button>
            </div>
        </div>

        {/* Filters Bar & Table (Existing code, just adding Action column) */}
        <div className="bg-white rounded-xl border border-beige-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-beige-lighter2 text-charcoal border-b border-beige-border">
                        <tr>
                            <th className="px-6 py-4 font-semibold w-16">Image</th>
                            <th className="px-6 py-4 font-semibold">Product Name</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">PriceIND</th>
                            <th className="px-6 py-4 font-semibold">PriceUSD</th>
                            <th className="px-6 py-4 font-semibold">Discount</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-beige-border">
                        {loading ? <tr><td colSpan="6" className="p-8 text-center">Loading...</td></tr> : 
                        products.map((product) => (
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
      </main>
    </div>
  );
};
export default AdminProducts;