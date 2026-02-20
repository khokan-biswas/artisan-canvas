import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import service from '../backend/config';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Palette, 
  Settings, 
  Search, 
  ChevronDown,
  Download,
  Loader2,
  MapPin // Added for Address icon
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, to = "#", active }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200 group ${
      active ? 'bg-[#EAE5D8] text-charcoal font-medium' : 'text-gray-500 hover:bg-[#F5F2EB] hover:text-charcoal'
    }`}
  >
    <Icon size={20} className={active ? 'text-charcoal' : 'text-gray-400 group-hover:text-charcoal'} />
    <span>{label}</span>
  </Link>
);

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await service.getOrders(); 
        setOrders(response.documents);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleUpdate = async (orderId, field, value) => {
      setUpdatingId(orderId);
      try {
          await service.updateOrder(orderId, { [field]: value });
          setOrders(prev => prev.map(o => o.$id === orderId ? { ...o, [field]: value } : o));
      } catch (error) {
          console.error("Update failed:", error);
          alert("Failed to update order.");
      } finally {
          setUpdatingId(null);
      }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
        (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (order.$id && order.$id.includes(searchTerm));
    const matchesStatus = filterStatus ? order.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
      const s = status?.toLowerCase() || '';
      if (s === 'paid' || s === 'completed') return 'bg-green-100 text-green-800 border-green-200';
      if (s === 'cod') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      if (s === 'failed') return 'bg-red-100 text-red-800 border-red-200';
      return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCompleteColor = (val) => {
      return val === 'yes' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex font-sans text-charcoal">
      
      <aside className="w-64 bg-[#F9F7F2] border-r border-[#EBE7DE] fixed h-full hidden md:flex flex-col z-20">
        <div className="p-8"><h1 className="text-2xl font-serif text-charcoal">Artisan Canvas</h1></div>
        <nav className="flex-1 px-4 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin/dashboard" />
            <SidebarItem icon={Package} label="Products" to="/admin/products" />
            <SidebarItem icon={ShoppingCart} label="Orders" active={true} to="/admin/orders" />
            <SidebarItem icon={Users} label="Customers" to="/admin/customers" />
            <SidebarItem icon={Palette} label="Upload" to="/admin/upload" />
            <SidebarItem icon={Settings} label="Settings" to="#" />
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-3xl font-serif text-charcoal">Orders Management</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition">
                <Download size={16} /> Export CSV
            </button>
        </div>

        <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative group">
                <select 
                    className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-charcoal outline-none focus:ring-1 focus:ring-charcoal cursor-pointer min-w-[140px]"
                    onChange={(e) => setFilterStatus(e.target.value)}
                    value={filterStatus}
                >
                    <option value="">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="COD">COD</option>
                    <option value="Failed">Failed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative w-full md:w-64">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                    type="text" 
                    placeholder="Search orders..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-charcoal outline-none"
                />
            </div>
        </div>

        <div className="bg-white rounded-b-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            {loading ? (
                <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-charcoal" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm table-fixed">
                        <thead className="bg-gray-50 text-charcoal border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-28">ID</th>
                                <th className="px-6 py-4 font-semibold w-32">Date</th>
                                <th className="px-6 py-4 font-semibold w-48">Customer</th>
                                <th className="px-6 py-4 font-semibold w-64">Shipping Address</th> {/* ✅ NEW COLUMN */}
                                <th className="px-6 py-4 font-semibold w-40 text-center">Payment Status</th>
                                <th className="px-6 py-4 font-semibold w-36 text-center">Order Complete</th>
                                <th className="px-6 py-4 font-semibold w-32">Method</th>
                                <th className="px-6 py-4 font-semibold w-28 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map((order) => {
                                const orderTotal = parseFloat(order.amount) || 0;
                                const currency = order.currency === 'INR' ? '₹' : '$';
                                const isUpdating = updatingId === order.$id;

                                return (
                                <tr key={order.$id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-charcoal truncate" title={order.$id}>
                                        #{order.$id.substring(0, 8)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                        {formatDate(order.$createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-charcoal font-medium">
                                        <div className="truncate">{order.customerName || "Guest"}</div>
                                        <div className="text-[11px] text-gray-400 font-normal truncate">{order.email}</div>
                                    </td>

                                    {/* ✅ NEW: Shipping Address Cell */}
                                    <td className="px-6 py-4 text-gray-500 group-hover:text-charcoal transition-colors">
                                        <div className="flex items-start gap-2">
                                            <MapPin size={14} className="mt-0.5 flex-shrink-0 text-gray-300" />
                                            <p className="text-xs leading-relaxed line-clamp-2" title={order.shippingAddress}>
                                                {order.shippingAddress || "No address provided"}
                                            </p>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center">
                                        {isUpdating ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
                                        ) : (
                                            <select 
                                                value={order.status || 'Pending'}
                                                onChange={(e) => handleUpdate(order.$id, 'status', e.target.value)}
                                                className={`appearance-none cursor-pointer px-3 py-1 rounded-full text-[11px] font-bold border outline-none transition-all ${getStatusColor(order.status)}`}
                                            >
                                                <option value="Paid">Paid</option>
                                                <option value="COD">COD</option>
                                                <option value="Failed">Failed</option>
                                            </select>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        {isUpdating ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400 mx-auto" />
                                        ) : (
                                            <select 
                                                value={order.ordercomplete || 'no'}
                                                onChange={(e) => handleUpdate(order.$id, 'ordercomplete', e.target.value)}
                                                className={`appearance-none cursor-pointer px-3 py-1 rounded-full text-[11px] font-bold border outline-none transition-all ${getCompleteColor(order.ordercomplete || 'no')}`}
                                            >
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-gray-500 text-xs font-medium uppercase tracking-tight">
                                        {order.paymentId && order.paymentId.includes("COD") ? "COD" : "PayPal"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-charcoal">
                                        {currency}{orderTotal.toLocaleString()}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default AdminOrders;