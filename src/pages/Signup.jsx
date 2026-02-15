import React, { useState } from 'react';
import authService from '../backend/auth';
import { Link, useNavigate } from 'react-router-dom';
import { login as authLogin } from '../store/authSlice';
import { useDispatch } from 'react-redux';
import { Loader2, User, Mail, Lock, Globe, Phone } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';

const Signup = () => {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const [registerData, setRegisterData] = useState({
        name: "", email: "", password: "", country: "India", phone: ""
    });

    const create = async (e) => {
        e.preventDefault();
        setError(""); setLoading(true);
        try {
            const userData = await authService.createAccount(registerData);
            if (userData) {
                const currentUser = await authService.getCurrentUser();
                if (currentUser) dispatch(authLogin(currentUser));
                navigate("/");
            }
        } catch (error) { setError(error.message); } 
        finally { setLoading(false); }
    };

    const handleChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });

    return (
        <div className='flex items-center justify-center min-h-screen bg-[#FDFBF7]'>
            <div className='w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100'>
                <h1 className="text-3xl font-serif text-charcoal text-center mb-8">Join the Gallery</h1>
                {error && <p className="text-red-600 mb-4 text-center bg-red-50 p-2 rounded">{error}</p>}

                <form onSubmit={create} className='space-y-5'>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input name="name" placeholder="Full Name" value={registerData.name} onChange={handleChange} className="w-full pl-10 p-3 border border-gray-200 rounded-sm outline-none" required />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input type="email" name="email" placeholder="Email" value={registerData.email} onChange={handleChange} className="w-full pl-10 p-3 border border-gray-200 rounded-sm outline-none" required />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input type="tel" name="phone" placeholder="Phone Number" value={registerData.phone} onChange={handleChange} className="w-full pl-10 p-3 border border-gray-200 rounded-sm outline-none" required />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input type="password" name="password" placeholder="Password" value={registerData.password} onChange={handleChange} className="w-full pl-10 p-3 border border-gray-200 rounded-sm outline-none" required />
                    </div>
                    <div className="relative">
                        <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <select name="country" value={registerData.country} onChange={handleChange} className="w-full pl-10 p-3 border border-gray-200 rounded-sm outline-none bg-white">
                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-charcoal text-white py-3 rounded-sm font-medium hover:bg-black transition-all flex justify-center items-center">
                        {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-600">Already have an account? <Link to="/login" className="font-medium text-charcoal hover:underline">Sign In</Link></p>
            </div>
        </div>
    );
};
export default Signup;