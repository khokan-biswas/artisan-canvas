import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { useDispatch } from 'react-redux';
import authService from '../backend/auth';
import service from '../backend/config';
import { login as authLogin } from '../store/authSlice';
import { setCart } from '../store/cartSlice';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState("");
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetSent, setResetSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

                {showForgot ? (
                    <>
                        {resetSent ? (
                            <div className="text-green-600 text-center mb-4">Check your email for the reset link/code.</div>
                        ) : (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setError("");
                                try {
                                    await authService.sendPasswordResetEmail(resetEmail);
                                    setResetSent(true);
                                } catch (err) {
                                    setError(err?.message || "Failed to send reset email.");
                                }
                            }} className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full p-3 border border-gray-300 rounded-sm focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    required
                                />
                                <button
                                    type="submit"
                                    className="w-full bg-charcoal text-white py-3 font-bold hover:bg-slate-800 transition uppercase tracking-widest text-sm"
                                >
                                    Send Reset Link
                                </button>
                                <button
                                    type="button"
                                    className="w-full mt-2 text-charcoal underline text-xs"
                                    onClick={() => { setShowForgot(false); setResetSent(false); setError(""); }}
                                >
                                    Back to Login
                                </button>
                            </form>
                        )}
                    </>
                ) : (
                    <>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full p-3 border border-gray-300 rounded-sm focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    className="w-full p-3 pr-12 border border-gray-300 rounded-sm focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-charcoal text-white py-3 font-bold hover:bg-slate-800 transition uppercase tracking-widest text-sm"
                            >
                                Log In
                            </button>
                        </form>
                        <div className="mt-4 text-center">
                            <Link
                                to="/reset-password" // Point this to your ResetPassword route
                                className="text-xs text-charcoal underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                    </>
                )}

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