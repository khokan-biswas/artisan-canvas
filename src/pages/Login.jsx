import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import authService from '../backend/auth';
import { login as authLogin } from '../store/authSlice';

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); // Clear previous errors
        
        if (!formData.email || !formData.password) {
            setError("Please enter both email and password");
            return;
        }

        try {
            const session = await authService.login(formData);
            console.log("Session created:", session);
            
            if (session) {
                const userData = await authService.getCurrentUser();
                console.log("User data retrieved:", userData);
                
                if (userData) {
                    dispatch(authLogin(userData));
                    navigate('/'); // Redirect to home
                } else {
                    setError("Failed to retrieve user information. Please try again.");
                }
            } else {
                setError("Failed to create session. Please try again.");
            }
        } catch (error) {
            console.error("Login error:", error);
            setError(error?.message || "Login failed. Please check your credentials and try again.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md bg-white p-8 shadow-lg rounded-sm">
                <h2 className="text-2xl font-serif font-bold text-center mb-6">Welcome Back</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        autoComplete="email"
                        className="w-full p-3 border border-gray-300 rounded-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        autoComplete="current-password"
                        className="w-full p-3 border border-gray-300 rounded-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button type="submit" className="w-full bg-charcoal text-white py-3 font-bold hover:bg-gold transition">
                        Log In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;