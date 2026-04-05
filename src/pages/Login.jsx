import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { useDispatch } from 'react-redux';
import authService from '../backend/auth';
import service from '../backend/config';
import { login as authLogin } from '../store/authSlice';
import { setCart } from '../store/cartSlice';

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); 
        
        if (!formData.email || !formData.password) {
            setError("Please enter both email and password");
            return;
        }

        try {
            const session = await authService.login(formData);
            
            if (session) {
                const userData = await authService.getCurrentUser();
                
                if (userData) {
                    dispatch(authLogin(userData));

                    // 🛒 SYNC CART: Fetch saved cart from database after login
                    const dbCart = await service.getCart(userData.$id);
                    if (dbCart && dbCart.length > 0) {
                        dispatch(setCart(dbCart));
                    }

                    navigate('/'); 
                } else {
                    setError("Failed to retrieve user information.");
                }
            } else {
                setError("Failed to create session.");
            }
        } catch (error) {
            setError(error?.message || "Login failed.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] bg-cream px-4">
            <div className="w-full max-w-md bg-white p-8 shadow-lg rounded-sm border border-gray-100">
                <h2 className="text-2xl font-serif font-bold text-center mb-6 text-charcoal">Welcome Back</h2>
                
                {error && (
                    <p className="text-red-500 text-sm text-center mb-4 bg-red-50 py-2 rounded-sm border border-red-100">
                        {error}
                    </p>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                        type="submit" 
                        className="w-full bg-charcoal text-white py-3 font-bold hover:bg-slate-800 transition uppercase tracking-widest text-sm"
                    >
                        Log In
                    </button>
                </form>

                {/* --- REGISTER OPTION START --- */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link 
                            to="/signup" 
                            className="text-charcoal font-bold hover:underline transition decoration-2 underline-offset-4"
                        >
                            Create Account
                        </Link>
                    </p>
                </div>
                {/* --- REGISTER OPTION END --- */}
            </div>
        </div>
    );
};

export default Login;