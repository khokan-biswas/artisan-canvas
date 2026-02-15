import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import service from '../backend/config'; // Import your backend service
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
  Save,
  CheckCircle2
} from 'lucide-react';

// --- Components ---

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

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null); // Track which row is updating

  // 1. Fetch Orders
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

  // 2. Handle Updates (Live Database Edit)
  const handleUpdate = async (orderId, field, value) => {
      setUpdatingId(orderId); // Show spinner for this row
      try {
          // Update in Database
          await service.updateOrder(orderId, { [field]: value });
          
          // Update in Local State (UI)
          setOrders(prev => prev.map(o => o.$id === orderId ? { ...o, [field]: value } : o));
          
      } catch (error) {
          console.error("Update failed:", error);
          alert("Failed to update order. Check console.");
      } finally {
          setUpdatingId(null);
      }
  };

  // 3. Filter Logic
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

  // Helper for Status Colors
  const getStatusColor = (status) => {
      const s = status?.toLowerCase() || '';
      if (s === 'paid' || s === 'completed') return 'bg-green-100 text-green-800 border-green-200';
      if (s === 'cod') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      if (s === 'failed') return 'bg-red-100 text-red-800 border-red-200';
      return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Helper for Order Complete Colors
  const getCompleteColor = (val) => {
      return val === 'yes' 
        ? 'bg-blue-100 text-blue-800 border-blue-200' 
        : 'bg-gray-100 text-gray-500 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex font-sans text-charcoal">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#F9F7F2] border-r border-[#EBE7DE] fixed h-full hidden md:flex flex-col z-20">
        <div className="p-8">
            <h1 className="text-2xl font-serif text-charcoal">Artisan Canvas</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin/dashboard" />
            <SidebarItem icon={Package} label="Products" to="/admin/products" />
            <SidebarItem icon={ShoppingCart} label="Orders" active={true} to="/admin/orders" />
            <SidebarItem icon={Users} label="Customers" to="/admin/customers" />
            <SidebarItem icon={Palette} label="Upload" to="/admin/upload" />
            <SidebarItem icon={Settings} label="Settings" to="#" />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h2 className="text-3xl font-serif text-charcoal">Orders</h2>
            <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition">
                    <Download size={16} /> Export CSV
                 </button>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-3 w-full md:w-auto overflow-x-auto">
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
            </div>
            <div className="relative w-full md:w-64">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                    type="text" 
                    placeholder="Search ID or Customer..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-charcoal outline-none transition-all"
                />
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-b-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-charcoal" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col h-64 items-center justify-center text-gray-400">
                    <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                    <p>No orders found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-charcoal border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-24">ID</th>
                                <th className="px-6 py-4 font-semibold w-32">Date</th>
                                <th className="px-6 py-4 font-semibold">Customer</th>
                                <th className="px-6 py-4 font-semibold w-32">Payment Status</th>
                                <th className="px-6 py-4 font-semibold w-32">Order Complete</th>
                                <th className="px-6 py-4 font-semibold">Method</th>
                                <th className="px-6 py-4 font-semibold text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.map((order) => {
                                const orderTotal = parseFloat(order.amount) || 0;
                                const currency = order.currency === 'INR' ? '₹' : '$';
                                const isUpdating = updatingId === order.$id;

                                return (
                                <tr key={order.$id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-charcoal truncate max-w-[200px]" title={order.$id}>
                                        #{order.$id.substring(0, 10)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {formatDate(order.$createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-charcoal font-medium">
                                        {order.customerName || "Guest"}
                                        <div className="text-xs text-gray-400 font-normal">{order.email}</div>
                                    </td>
                                    
                                    {/* 🟢 EDITABLE: Payment Status */}
                                    <td className="px-6 py-4">
                                        {isUpdating ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        ) : (
                                            <select 
                                                value={order.status || 'Pending'}
                                                onChange={(e) => handleUpdate(order.$id, 'status', e.target.value)}
                                                className={`appearance-none cursor-pointer pl-3 pr-8 py-1 rounded-full text-xs font-bold border outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 transition-all ${getStatusColor(order.status)}`}
                                            >
                                                <option value="Paid">Paid</option>
                                                <option value="COD">COD</option>
                                                {/* <option value="Pending">Pending</option> */}
                                                {/* <option value="Failed">Failed</option> */}
                                            </select>
                                        )}
                                    </td>

                                    {/* 🔵 EDITABLE: Order Complete */}
                                    <td className="px-6 py-4">
                                        {isUpdating ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        ) : (
                                            <select 
                                                value={order.ordercomplete || 'no'} // Default to 'no' if attribute missing
                                                onChange={(e) => handleUpdate(order.$id, 'ordercomplete', e.target.value)}
                                                className={`appearance-none cursor-pointer pl-3 pr-8 py-1 rounded-full text-xs font-bold border outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 transition-all ${getCompleteColor(order.ordercomplete || 'no')}`}
                                            >
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-gray-500 capitalize">
                                        {order.paymentId && order.paymentId.length > 20 ? "PayPal" : "COD / Manual"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-charcoal font-serif">
                                        {currency}{orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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