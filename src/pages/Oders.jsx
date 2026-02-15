import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Query } from 'appwrite';
import service from '../backend/config';
import authService from '../backend/auth';
import OptimizedImage from '../components/OptimizedImage';
import { Loader2, Package, Calendar, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';

const Orders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [paintingsMap, setPaintingsMap] = useState({}); // Stores painting details by ID
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get Current User
                const user = await authService.getCurrentUser();
                if (!user) {
                    navigate('/login');
                    return;
                }

                // 2. Fetch User's Orders
                const ordersResponse = await service.getOrders([
                    Query.equal('userId', user.$id),
                    Query.orderDesc('$createdAt')
                ]);

                const userOrders = ordersResponse.documents;
                setOrders(userOrders);

                // 3. Extract all Painting IDs from orders to fetch their details
                // The 'paintingId' field is a comma-separated string "id1,id2"
                const allPaintingIds = new Set();
                userOrders.forEach(order => {
                    if (order.paintingId) {
                        const ids = order.paintingId.split(',');
                        ids.forEach(id => allPaintingIds.add(id.trim()));
                    }
                });

                // 4. Fetch Painting Details (only if we have IDs)
                if (allPaintingIds.size > 0) {
                    // Appwrite allows filtering by array: Query.equal('$id', [id1, id2])
                    const pIds = Array.from(allPaintingIds);
                    // Split into chunks if too many (Appwrite limit usually 100)
                    // For simplicity, assuming <100 unique items for now
                    const paintingsResponse = await service.getPaintings([
                        Query.equal('$id', pIds)
                    ]);

                    // Create a lookup map: { "id1": { title: "Sun", imageUrl: "..." } }
                    const pMap = {};
                    paintingsResponse.documents.forEach(p => {
                        pMap[p.$id] = p;
                    });
                    setPaintingsMap(pMap);
                }

            } catch (err) {
                console.error("Error fetching orders:", err);
                setError("Failed to load your order history.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    // --- Helpers ---
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const s = status.toLowerCase();
        if (s === 'paid' || s === 'completed') return 'bg-green-100 text-green-800 border-green-200';
        if (s === 'shipped') return 'bg-blue-100 text-blue-800 border-blue-200';
        if (s === 'cancelled') return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                <Loader2 className="animate-spin h-10 w-10 text-charcoal" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-serif text-charcoal mb-2">My Collection</h1>
                <p className="text-gray-500 mb-8">History of your acquired masterpieces.</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex items-center gap-2 border border-red-100">
                        <AlertCircle size={20} /> {error}
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-serif text-charcoal mb-2">No orders yet</h3>
                        <p className="text-gray-500 mb-6">Start your collection today.</p>
                        <Link to="/shop" className="inline-block bg-charcoal text-white px-8 py-3 rounded-sm font-medium hover:bg-black transition">
                            Visit Gallery
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            // Parse painting IDs for this specific order
                            const itemIds = order.paintingId ? order.paintingId.split(',') : [];

                            return (
                                <div key={order.$id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Order Header */}
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center text-sm">
                                        <div className="flex gap-6">
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Order Placed</p>
                                                <p className="text-charcoal font-medium">{formatDate(order.$createdAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Total</p>
                                                <p className="text-charcoal font-medium font-serif">
                                                    {/* Display currency symbol if stored, else generic */}
                                                    {order.currency === 'INR' ? '₹' : '$'}
                                                    {order.amount?.toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wider font-bold">Order #</p>
                                                <p className="text-charcoal font-medium">{order.$id.substring(0,10).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="p-6">
                                        <div className="space-y-6">
                                            {itemIds.map((itemId) => {
                                                const painting = paintingsMap[itemId.trim()];
                                                
                                                if (!painting) return null; // Skip if painting data missing (deleted?)

                                                return (
                                                    <div key={itemId} className="flex gap-4 items-center">
                                                        {/* Image */}
                                                        <div className="h-24 w-20 flex-shrink-0 bg-gray-100 rounded-sm overflow-hidden border border-gray-100">
                                                            <OptimizedImage 
                                                                src={service.getThumbnail(painting.imageUrl)} 
                                                                alt={painting.title} 
                                                                className="h-full w-full object-cover" 
                                                            />
                                                        </div>

                                                        {/* Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-lg font-serif text-charcoal font-medium truncate">
                                                                {painting.title}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 mb-2">{painting.medium} • {painting.width}" x {painting.height}"</p>
                                                            
                                                            <Link 
                                                                to={`/product/${painting.$id}`} 
                                                                className="text-sm text-charcoal underline hover:text-gray-600 transition inline-flex items-center gap-1"
                                                            >
                                                                View Artwork <ChevronRight size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Footer / Actions */}
                                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                                        {/* Optional: Add 'Track Package' or 'Invoice' buttons here later */}
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <CreditCard size={12} /> Paid via PayPal
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;