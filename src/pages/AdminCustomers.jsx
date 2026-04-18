import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import service from '../backend/config'; 
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Palette, 
  Search, 
  ChevronDown,
  Download,
  Mail,
  MapPin,
  Loader2
} from 'lucide-react';

// --- Components (Reused) ---

const SidebarItem = ({ icon: Icon, label, to = "#", active }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200 group ${
      active 
        ? 'bg-[#EAE5D8] text-charcoal font-medium' 
        : 'text-gray-500 hover:bg-[#F5F2EB] hover:text-charcoal'
    }`}
  >
    <Icon size={20} className={active ? 'text-charcoal' : 'text-gray-400 group-hover:text-charcoal'} />
    <span>{label}</span>
  </Link>
);

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  // 1. Fetch Customers & Calculate Stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordersResponse = await service.getOrders();
        const orders = ordersResponse.documents;

        const customerMap = {};

        orders.forEach(order => {
            const key = order.userId || order.email; 
            
            let shipping = {};
            try {
                shipping = typeof order.shippingAddress === 'string' 
                    ? JSON.parse(order.shippingAddress) 
                    : order.shippingAddress || {};
            } catch (e) {
//                 console.warn("Error parsing shipping for order", order.$id);
            }

            if (!customerMap[key]) {
                customerMap[key] = {
                    id: key,
                    name: order.customerName || "Guest",
                    email: order.email || "No Email",
                    country: shipping.country || "Unknown",
                    city: shipping.city || "-",
                    totalOrders: 0,
                    // 👇 NEW: Separate totals for INR and USD
                    totalSpentINR: 0,
                    totalSpentUSD: 0,
                    lastActive: order.$createdAt
                };
            }

            // 👇 LOGIC: Aggregate Stats
            customerMap[key].totalOrders += 1;
            
            const orderAmount = parseFloat(order.amount) || 0;
            
            // Check currency field (default to Logic if missing for old data)
            let currency = order.currency;
            if (!currency) {
                // Fallback: If country is India -> INR, else -> USD
                currency = (shipping.country === 'India') ? 'INR' : 'USD';
            }

            if (currency === 'INR') {
                customerMap[key].totalSpentINR += orderAmount;
            } else {
                customerMap[key].totalSpentUSD += orderAmount;
            }
            
            // Keep most recent date & location
            if (new Date(order.$createdAt) > new Date(customerMap[key].lastActive)) {
                customerMap[key].lastActive = order.$createdAt;
                if (shipping.country) {
                    customerMap[key].country = shipping.country;
                    customerMap[key].city = shipping.city || "-";
                }
            }
        });

        setCustomers(Object.values(customerMap));
      } catch (error) {
//         console.error("Failed to fetch customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. Filter Logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = filterCountry ? c.country === filterCountry : true;

    return matchesSearch && matchesCountry;
  });

  const uniqueCountries = [...new Set(customers.map(c => c.country))].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex font-sans text-charcoal">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-[#F9F7F2] border-r border-[#EBE7DE] fixed h-full hidden md:flex flex-col z-20">
        <div className="p-8">
            <h1 className="text-2xl font-serif text-charcoal">Adhunic Art</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin/dashboard" />
            <SidebarItem icon={Package} label="Products" to="/admin/products" />
            <SidebarItem icon={ShoppingCart} label="Orders" to="/admin/orders" />
            <SidebarItem icon={Users} label="Customers" active={true} to="/admin/customers" />
            <SidebarItem icon={Palette} label="Upload" to="/admin/upload" />
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-3xl font-serif text-charcoal">Customers</h2>
            <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition">
                    <Download size={16} /> Export CSV
                 </button>
            </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Left: Dropdowns */}
            <div className="flex gap-3 w-full md:w-auto overflow-x-auto">
                <div className="relative group">
                    <select 
                        className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-charcoal outline-none focus:ring-1 focus:ring-charcoal cursor-pointer min-w-[150px]"
                        onChange={(e) => setFilterCountry(e.target.value)}
                        value={filterCountry}
                    >
                        <option value="">All Countries</option>
                        {uniqueCountries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Right: Search */}
            <div className="relative w-full md:w-64">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                    type="text" 
                    placeholder="Search name or email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-charcoal outline-none transition-all"
                />
            </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-b-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-charcoal" />
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col h-64 items-center justify-center text-gray-400">
                    <Users className="h-12 w-12 mb-2 opacity-20" />
                    <p>No customers found.</p>
                </div>
            ) : (
                <>
                    <div className="md:hidden p-4 space-y-4">
                        {filteredCustomers.map((customer, i) => (
                            <div key={i} className="rounded-3xl border border-[#E6E0D6] bg-[#FCFBF7] p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold text-charcoal truncate">{customer.name}</h3>
                                        <p className="text-[11px] text-gray-500 mt-1 truncate">{customer.email}</p>
                                    </div>
                                    <span className="text-[11px] text-gray-500">Last active</span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                                    <div className="rounded-2xl bg-white p-3 border border-[#E6E0D6]">
                                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Location</div>
                                        <div className="mt-2 text-charcoal truncate">{customer.city !== '-' ? `${customer.city}, ` : ''}{customer.country}</div>
                                    </div>
                                    <div className="rounded-2xl bg-white p-3 border border-[#E6E0D6]">
                                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Orders</div>
                                        <div className="mt-2 font-semibold text-charcoal">{customer.totalOrders}</div>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                                    <div className="rounded-2xl bg-white p-3 border border-[#E6E0D6]">
                                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Spent (INR)</div>
                                        <div className="mt-2 font-semibold text-charcoal">{customer.totalSpentINR > 0 ? `₹${customer.totalSpentINR.toLocaleString()}` : '-'}</div>
                                    </div>
                                    <div className="rounded-2xl bg-white p-3 border border-[#E6E0D6]">
                                        <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Spent (USD)</div>
                                        <div className="mt-2 font-semibold text-charcoal">{customer.totalSpentUSD > 0 ? `$${customer.totalSpentUSD.toLocaleString()}` : '-'}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-charcoal border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Customer Name</th>
                                    <th className="px-6 py-4 font-semibold">Email Address</th>
                                    <th className="px-6 py-4 font-semibold">Location</th>
                                    <th className="px-6 py-4 font-semibold text-center">Orders</th>
                                    <th className="px-6 py-4 font-semibold text-right">Spent (INR)</th>
                                    <th className="px-6 py-4 font-semibold text-right">Spent (USD)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.map((customer, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-medium text-charcoal">
                                            {customer.name}
                                            <div className="text-xs text-gray-400 font-normal mt-0.5">
                                                Last Active: {new Date(customer.lastActive).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-gray-300" />
                                                {customer.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-charcoal">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-gray-300" />
                                                {customer.city !== '-' ? `${customer.city}, ` : ''}{customer.country}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-gray-100 text-gray-700 py-1 px-3 rounded-full text-xs font-medium">
                                                {customer.totalOrders}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-charcoal font-serif">
                                            {customer.totalSpentINR > 0 ? `₹${customer.totalSpentINR.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-charcoal font-serif">
                                            {customer.totalSpentUSD > 0 ? `$${customer.totalSpentUSD.toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            
            {/* Footer */}
            {!loading && filteredCustomers.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>Showing {filteredCustomers.length} customers</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-200 bg-white rounded hover:bg-gray-100 disabled:opacity-50" disabled>Prev</button>
                        <button className="px-3 py-1 border border-gray-200 bg-white rounded hover:bg-gray-100 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            )}
        </div>

      </main>
    </div>
  );
};

export default AdminCustomers;
