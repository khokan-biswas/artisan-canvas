import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice.js';
import { clearCart } from '../store/cartSlice.js';
import authService from '../backend/auth.js';
import { ShoppingCart, Menu, X, User, LogOut, Package, LayoutDashboard, Home, Info, Users, Palette } from 'lucide-react';

const Header = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hideHeader, setHideHeader] = useState(false);
    const prevScrollY = useRef(0);

    const authStatus = useSelector((state) => state.auth.status);
    const cartItems = useSelector((state) => state.cart.cartItems);
    const userData = useSelector((state) => state.auth.userData);
    const location = useLocation();
    const ADMIN_EMAIL = "s9618137@gmail.com";
    const isAdmin = userData?.email === ADMIN_EMAIL;
    const isAdminPath = location.pathname.startsWith('/admin');
    const showAdminBar = isAdmin && isAdminPath;
    const showMobileNav = !isAdminPath;

    // Get the first letter of name or email for the profile avatar
    const userInitial = userData?.name?.[0] || userData?.email?.[0] || 'U';

    useEffect(() => {
        const handleScroll = () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > prevScrollY.current && currentScroll > 80) {
                setHideHeader(true);
            } else {
                setHideHeader(false);
            }
            prevScrollY.current = currentScroll;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const logoutHandler = async () => {
        try {
            await authService.logout();
            dispatch(logout());
            dispatch(clearCart());
            navigate('/login');
            setIsMobileMenuOpen(false);
        } catch (error) {
//             console.error("Logout failed", error);
        }
    };

    const navItems = [
        { name: 'Home', slug: '/', active: true },
        { name: 'Shop', slug: '/shop', active: true },
        { name: 'About', slug: '/about', active: true },
    ];

    return (<>
        <header className={`sticky top-0 z-50 w-full bg-[#FDFBF7]/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-all duration-300 transform ${hideHeader ? '-translate-y-full' : 'translate-y-0'}`}>
            <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    
                    {/* --- LEFT: Logo --- */}
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
                        <h1 className="text-2xl font-serif font-bold text-slate-800 tracking-wide">
                            Adhunic Art
                        </h1>
                    </div>

                    {/* --- CENTER: Desktop Navigation --- */}
                    <div className="hidden md:flex items-center space-x-5 overflow-x-auto no-scrollbar">
                        {navItems.map((item) => (
                            <Link key={item.name} to={item.slug} className="text-sm font-medium text-gray-600 hover:text-black uppercase tracking-wider transition-colors whitespace-nowrap">
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* --- RIGHT: Actions & Profile Section --- */}
                    <div className="hidden md:flex items-center space-x-6">
                        
                        {/* Cart */}
                        <Link to="/checkout" className="relative group p-2">
                            <ShoppingCart className="h-6 w-6 text-gray-600 group-hover:text-black transition" />
                            {cartItems.length > 0 && (
                                <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#FDFBF7]">
                                    {cartItems.length}
                                </span>
                            )}
                        </Link>

                        {authStatus ? (
                            <div className="flex items-center gap-6 pl-4 border-l border-gray-200">
                                
                                {isAdmin && (
                                    <Link to="/admin/dashboard" className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition" title="Admin Dashboard">
                                        <LayoutDashboard size={18} />
                                        <span>Admin</span>
                                    </Link>
                                )}

                                <Link to="/orders" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-black transition" title="My Orders">
                                    <Package size={18} />
                                    <span>Orders</span>
                                </Link>

                                <button onClick={logoutHandler} className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 transition" title="Logout">
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>

                                {/* --- 👤 PROFILE LOGO (FAR RIGHT) --- */}
                                <Link 
                                    to="/user-details" 
                                    className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm border-2 border-transparent hover:border-slate-800 hover:bg-white hover:text-slate-800 transition-all duration-300 uppercase shadow-sm"
                                    title="Profile Settings"
                                >
                                    {userInitial}
                                </Link>
                            </div>
                        ) : (
                            <Link to="/login" className="flex items-center gap-2 text-sm font-bold text-black border border-black px-6 py-2 rounded-sm hover:bg-black hover:text-white transition uppercase tracking-widest">
                                <User size={18} /> Login
                            </Link>
                        )}
                    </div>

                    {/* --- MOBILE: Menu Button --- */}
                    <div className="md:hidden flex items-center gap-4">
                        <Link to="/checkout" className="relative p-2">
                             <ShoppingCart size={24} className="text-gray-700" />
                             {cartItems.length > 0 && (
                                <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                    {cartItems.length}
                                </span>
                             )}
                        </Link>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
                            {isMobileMenuOpen ? <X size={30} /> : <Menu size={30} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MOBILE MENU DRAWER --- */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-[#FDFBF7] border-t border-gray-200 absolute w-full left-0 shadow-xl p-6 space-y-4">
                    
                    {authStatus && (
                        <Link to="/user-details" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 pb-4 border-b border-gray-100">
                             <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg uppercase">
                                {userInitial}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-black uppercase tracking-widest">Profile Settings</span>
                                <span className="text-xs text-gray-500 truncate max-w-[200px]">{userData?.email}</span>
                            </div>
                        </Link>
                    )}

                    {navItems.map((item) => (
                        <Link key={item.name} to={item.slug} onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-lg font-medium text-gray-700 hover:text-black transition">
                            {item.name}
                        </Link>
                    ))}
                    
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                        <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-gray-700 font-medium">
                            <Package size={20}/> My Orders
                        </Link>
                        {isAdmin && (
                            <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-blue-600 font-bold">
                                <LayoutDashboard size={20}/> Admin Dashboard
                            </Link>
                        )}
                        {authStatus ? (
                            <button onClick={logoutHandler} className="flex items-center gap-3 text-red-600 font-bold py-2">
                                <LogOut size={20}/> Logout Account
                            </button>
                        ) : (
                            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full bg-black text-white text-center py-3 rounded-sm font-bold uppercase tracking-widest text-xs">
                                Login / Register
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>

        {showAdminBar && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F8FBFF] border-t border-gray-200 shadow-xl">
                <div className="flex items-center justify-around gap-2 px-2 py-2 overflow-x-auto">
                    {[
                        { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
                        { label: 'Products', to: '/admin/products', icon: <Package size={18} /> },
                        { label: 'Orders', to: '/admin/orders', icon: <ShoppingCart size={18} /> },
                        { label: 'Customers', to: '/admin/customers', icon: <Users size={18} /> },
                        { label: 'Upload', to: '/admin/upload', icon: <Palette size={18} /> },
                    ].map((link) => (
                        <button
                            key={link.to}
                            type="button"
                            onClick={() => { navigate(link.to); setIsMobileMenuOpen(false); }}
                            className="flex flex-col items-center justify-center flex-shrink-0 w-16 h-16 rounded-2xl bg-white text-charcoal shadow-sm"
                        >
                            {link.icon}
                            <span className="mt-1 text-[10px] font-semibold text-gray-600 text-center leading-tight">{link.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Mobile Bottom Navbar */}
        {showMobileNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-xl">
            <nav className="flex items-center justify-between px-4 py-3">
                <button type="button" onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center justify-center space-y-1 text-[10px] text-gray-600 hover:text-black transition">
                    <Home size={20} />
                    <span>Home</span>
                </button>
                <button type="button" onClick={() => { navigate('/shop'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center justify-center space-y-1 text-[10px] text-gray-600 hover:text-black transition">
                    <ShoppingCart size={20} />
                    <span>Shop</span>
                </button>
                <button type="button" onClick={() => { navigate('/about'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center justify-center space-y-1 text-[10px] text-gray-600 hover:text-black transition">
                    <Info size={20} />
                    <span>About</span>
                </button>
                <button type="button" onClick={() => { navigate(authStatus ? '/user-details' : '/login'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center justify-center space-y-1 text-[10px] text-gray-600 hover:text-black transition">
                    <User size={20} />
                    <span>Profile</span>
                </button>
                {authStatus ? (
                    <button type="button" onClick={logoutHandler} className="flex flex-col items-center justify-center space-y-1 text-[10px] text-red-500 hover:text-red-700 transition">
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                ) : (
                    <button type="button" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center justify-center space-y-1 text-[10px] text-gray-600 hover:text-black transition">
                        <LogOut size={20} />
                        <span>Login</span>
                    </button>
                )}
            </nav>
        </div>
        )}
    </>);
};

export default Header;
