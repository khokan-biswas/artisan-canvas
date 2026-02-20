import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import authService from '../backend/auth';
import service from '../backend/config'; // Added to fetch cart
import { login as authLogin } from '../store/authSlice';
import { setCart } from '../store/cartSlice'; // Added to update store

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
        <div className="flex items-center justify-center min-h-[80vh] bg-cream">
            <div className="w-full max-w-md bg-white p-8 shadow-lg rounded-sm border border-gray-100">
                <h2 className="text-2xl font-serif font-bold text-center mb-6 text-charcoal">Welcome Back</h2>
                {error && <p className="text-red-500 text-sm text-center mb-4 bg-red-50 py-2 rounded-sm">{error}</p>}
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-charcoal outline-none transition"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-charcoal outline-none transition"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button type="submit" className="w-full bg-charcoal text-white py-3 font-bold hover:bg-slate-800 transition uppercase tracking-widest text-sm">
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;