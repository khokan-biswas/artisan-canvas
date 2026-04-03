import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import service from '../backend/config';
import authService from '../backend/auth';
import { login } from '../store/authSlice';
import { 
    Loader2, User, Mail, MapPin, Phone, Globe, 
    ShieldCheck, Edit3, Save, X, Building, Map, Hash 
} from 'lucide-react';

const UserDetails = () => {
    const userData = useSelector((state) => state.auth.userData);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // 1. Added 'zip' to Form State
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        country: "",
        state: "",
        city: "", 
        zip: "", // New Field
        address: ""
    });
    const [msg, setMsg] = useState({ type: "", text: "" });

    useEffect(() => {
        if (!userData) {
            navigate('/login');
            return;
        }

        const fetchFullProfile = async () => {
            try {
                const profile = await service.getUserProfile(userData.$id);
                if (profile) {
                    setDbUser(profile);
                    setFormData({
                        name: profile.name || "",
                        phone: profile.phone || "",
                        country: profile.country || "",
                        state: profile.state || "",
                        city: profile.city || "", 
                        zip: profile.zip || "", // Load Zip from DB
                        address: profile.address || ""
                    });
                }
            } catch (error) {
//                 console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFullProfile();
    }, [userData, navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setMsg({ type: "", text: "" });

        try {
            // Update Auth name
            await authService.updateName(formData.name);

            // 2. Included 'zip' in the update payload
            const updatedDoc = await service.updateUserProfile(userData.$id, {
                name: formData.name,
                phone: formData.phone,
                country: formData.country,
                state: formData.state,
                city: formData.city,
                zip: formData.zip, // Storing Zip
                address: formData.address
            });

            setDbUser(updatedDoc);
            
            const freshAuthUser = await authService.getCurrentUser();
            dispatch(login(freshAuthUser));

            setMsg({ type: "success", text: "Master profile updated successfully!" });
            setIsEditing(false);
        } catch (error) {
            setMsg({ type: "error", text: error.message || "Failed to update profile" });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
            <Loader2 className="animate-spin text-charcoal" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFBF7] py-16 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-[#EBE7DE] shadow-sm overflow-hidden">
                    
                    {/* Header Section */}
                    <div className="bg-slate-800 p-10 text-white flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-4xl font-serif font-bold border border-white/20 uppercase">
                            {formData.name?.[0] || userData?.email?.[0]}
                        </div>
                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl font-bold tracking-tight mb-1">{dbUser?.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 text-sm">
                                <span className="flex items-center gap-1"><Mail size={14}/> {dbUser?.email}</span>
                                <span className="flex items-center gap-1"><Building size={14}/> {dbUser?.city}</span>
                                <span className="flex items-center gap-1"><Hash size={14}/> {dbUser?.zip}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full transition text-sm font-medium border border-white/10"
                        >
                            {isEditing ? <><X size={16}/> Cancel</> : <><Edit3 size={16}/> Edit Profile</>}
                        </button>
                    </div>

                    <div className="p-10">
                        {msg.text && (
                            <div className={`mb-8 p-4 text-sm font-medium border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                {msg.text}
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Left Column */}
                            <div className="space-y-6">
                                <DetailField 
                                    icon={<User size={16}/>} 
                                    label="Full Name" 
                                    value={formData.name} 
                                    isEditing={isEditing} 
                                    onChange={(v) => setFormData({...formData, name: v})}
                                />
                                <DetailField 
                                    icon={<Phone size={16}/>} 
                                    label="Phone Number" 
                                    value={formData.phone} 
                                    isEditing={isEditing} 
                                    onChange={(v) => setFormData({...formData, phone: v})}
                                />
                                <DetailField 
                                    icon={<Building size={16}/>} 
                                    label="City" 
                                    value={formData.city} 
                                    isEditing={isEditing} 
                                    onChange={(v) => setFormData({...formData, city: v})}
                                />
                                <DetailField 
                                    icon={<Hash size={16}/>} 
                                    label="Zip / Postal Code" 
                                    value={formData.zip} 
                                    isEditing={isEditing} 
                                    onChange={(v) => setFormData({...formData, zip: v})}
                                />
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                <DetailField 
                                    icon={<Map size={16}/>} 
                                    label="State / Province" 
                                    value={formData.state} 
                                    isEditing={isEditing} 
                                    onChange={(v) => setFormData({...formData, state: v})}
                                />
                                <DetailField 
                                    icon={<Globe size={16}/>} 
                                    label="Country" 
                                    value={formData.country} 
                                    isEditing={isEditing} 
                                    onChange={(v) => setFormData({...formData, country: v})}
                                />
                                <DetailField 
                                    icon={<MapPin size={16}/>} 
                                    label="Detailed Address" 
                                    value={formData.address} 
                                    isEditing={isEditing} 
                                    isTextArea
                                    onChange={(v) => setFormData({...formData, address: v})}
                                />
                            </div>

                            {/* Action Footer */}
                            <div className="md:col-span-2 pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                    Last Updated: {new Date(dbUser?.$updatedAt).toLocaleDateString()}
                                </div>
                                {isEditing && (
                                    <button 
                                        type="submit" 
                                        disabled={updating}
                                        className="w-full md:w-auto bg-charcoal text-white px-12 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition flex items-center justify-center gap-3 shadow-lg"
                                    >
                                        {updating ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                        Confirm Master Profile
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailField = ({ icon, label, value, isEditing, onChange, isTextArea }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            {icon} {label}
        </label>
        {isEditing ? (
            isTextArea ? (
                <textarea 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full border-b border-gray-300 py-2 focus:border-charcoal outline-none transition-colors resize-none h-20 text-sm font-medium"
                />
            ) : (
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full border-b border-gray-300 py-2 focus:border-charcoal outline-none transition-colors text-sm font-medium"
                />
            )
        ) : (
            <p className="text-sm font-medium text-slate-700 py-2 border-b border-transparent">
                {value || <span className="text-gray-300 italic">Not provided</span>}
            </p>
        )}
    </div>
);

export default UserDetails;
