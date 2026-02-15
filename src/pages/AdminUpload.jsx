import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import service from '../backend/config';
import { 
  Loader2, UploadCloud, LayoutDashboard, Package, ShoppingCart, 
  Users, Palette, Settings, Ruler, IndianRupee, X, CheckSquare 
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

// --- Sidebar Component ---
const SidebarItem = ({ icon: Icon, label, to = "#", active }) => (
  <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200 group ${active ? 'bg-[#EAE5D8] text-charcoal font-medium' : 'text-gray-500 hover:bg-[#F5F2EB] hover:text-charcoal'}`}>
    <Icon size={20} className={active ? 'text-charcoal' : 'text-gray-400 group-hover:text-charcoal'} />
    <span>{label}</span>
  </Link>
);

const AdminUpload = () => {
    const { register, handleSubmit, setValue, watch, reset } = useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Image States
    const [mainPreview, setMainPreview] = useState(null);
    const [galleryPreviews, setGalleryPreviews] = useState([null, null, null]); // 3 Slots
    const [galleryFiles, setGalleryFiles] = useState([null, null, null]);

    const navigate = useNavigate();
    const location = useLocation();
    const editModeProduct = location.state?.product;

    // --- 1. Load Data for Edit Mode ---
    useEffect(() => {
        if (editModeProduct) {
            const fields = [
                'title', 'artist', 'category', 'medium', 'style', 
                'shippingZone', 'width', 'height', 'description', 
                'pricein', 'discountin', 'priceusd', 'discountusd', 'isFeatured', 'frameStatus'
            ];
            fields.forEach(field => setValue(field, editModeProduct[field]));

            // Set Main Image Preview
            if (editModeProduct.imageUrl) {
                setMainPreview(service.getThumbnail(editModeProduct.imageUrl));
            }

            // Set Gallery Previews
            if (editModeProduct.gallery && Array.isArray(editModeProduct.gallery)) {
                const newPreviews = [null, null, null];
                editModeProduct.gallery.forEach((url, index) => {
                    if (index < 3) newPreviews[index] = url;
                });
                setGalleryPreviews(newPreviews);
            }
        }
    }, [editModeProduct, setValue]);

    // --- 2. Image Handlers ---
    const mainImageFile = watch('image');
    useEffect(() => {
        if (mainImageFile && mainImageFile[0]) {
            setMainPreview(URL.createObjectURL(mainImageFile[0]));
        }
    }, [mainImageFile]);

    const handleGalleryChange = (e, index) => {
        const file = e.target.files[0];
        if (file) {
            // Update File State
            const updatedFiles = [...galleryFiles];
            updatedFiles[index] = file;
            setGalleryFiles(updatedFiles);

            // Update Preview State
            const updatedPreviews = [...galleryPreviews];
            updatedPreviews[index] = URL.createObjectURL(file);
            setGalleryPreviews(updatedPreviews);
        }
    };

    const removeGalleryImage = (index) => {
        const updatedFiles = [...galleryFiles];
        updatedFiles[index] = null;
        setGalleryFiles(updatedFiles);

        const updatedPreviews = [...galleryPreviews];
        updatedPreviews[index] = null;
        setGalleryPreviews(updatedPreviews);
    };

    // --- 3. Helper: Compress & Upload ---
    const uploadHelper = async (file) => {
        if (!file) return null;
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: "image/webp" };
        try {
            const compressedFile = await imageCompression(file, options);
            const finalFile = new File([compressedFile], file.name, { type: "image/webp" });
            const response = await service.uploadFile(finalFile);
            return response.$id; // Or URL depending on your service return
        } catch (err) {
            console.warn("Compression failed, uploading original", err);
            const response = await service.uploadFile(file);
            return response.$id;
        }
    };

    // --- 4. Submit Handler ---
    const submitHandler = async (data) => {
        setLoading(true);
        setError(null);
        try {
            // A. Upload Main Image (If changed)
            let mainImageId = editModeProduct ? editModeProduct.imageUrl : null;
            if (data.image && data.image[0]) {
                const uploadedId = await uploadHelper(data.image[0]);
                // If service.uploadFile returns ID, we construct URL manually or store ID. 
                // Assuming service.uploadFile returns the file object with $id.
                // For this example, let's assume we store the ID and getThumbnail handles it, 
                // OR we store the full URL. Let's stick to your config which likely returns ID.
                mainImageId = service.getThumbnail(uploadedId); // Convert ID to URL for consistency if needed
            }

            // B. Upload Gallery Images
            let finalGallery = editModeProduct ? [...(editModeProduct.gallery || [])] : [];
            
            // Allow replacing specific slots or adding new ones
            const galleryPromises = galleryFiles.map(async (file, index) => {
                if (file) {
                    const uploadedId = await uploadHelper(file);
                    const url = service.getThumbnail(uploadedId);
                    return { index, url };
                }
                return null;
            });

            const uploadedGalleryItems = await Promise.all(galleryPromises);
            
            // Reconstruct the gallery array (Simple approach: just list valid URLs)
            // If you want strict slot management, this logic needs to be complex.
            // Here we just append new uploads or replace if we are tracking indices strictly.
            // Simplest for now: Filter valid new uploads and overwrite the editMode gallery if needed.
            
            let newGalleryUrls = uploadedGalleryItems.filter(item => item !== null).map(item => item.url);
            
            // If editing, we might want to keep old ones that weren't changed.
            // For simplicity in this version: We combine existing + new. 
            // *Production Tip:* Ideally, you map slots exactly.
            if(newGalleryUrls.length > 0) {
                 // In a real app, you'd manage the array indices carefully. 
                 // Here we just use the new list if provided, or fallback to 3 slots logic.
                 finalGallery = newGalleryUrls; 
            } else if (!editModeProduct) {
                 finalGallery = [];
            }


            // C. Prepare Payload
            const payload = {
                title: data.title,
                artist: data.artist, // [NEW]
                category: data.category || "Misc",
                description: data.description || "",
                imageUrl: mainImageId,
                gallery: finalGallery, // [NEW]
                medium: data.medium || "",
                style: data.style || "",
                width: data.width || "",
                height: data.height || "",
                frameStatus: data.frameStatus || "Rolled", // [NEW]
                shippingZone: data.shippingZone || "Global",
                isFeatured: data.isFeatured || false, // [NEW]

                // Pricing
                pricein: parseFloat(data.pricein) || 0,
                discountin: parseFloat(data.discountin) || 0,
                priceusd: parseFloat(data.priceusd) || 0,
                discountusd: parseFloat(data.discountusd) || 0,

                // Defaults
                isSold: editModeProduct ? Boolean(editModeProduct.isSold) : false,
            };

            // D. Send to Backend
            if (editModeProduct) {
                await service.updatePainting(editModeProduct.$id, payload);
            } else {
                await service.createPainting(payload);
            }
            
            navigate('/admin/products');
        } catch (err) {
            console.error("Operation failed", err);
            setError(err.message || "Failed to save product.");
        } finally {
            setLoading(false);
        }
    };

    // UI Constants
    const inputClass = "w-full bg-[#F9F7F2] border border-[#EBE7DE] text-charcoal p-3 rounded-sm focus:bg-white focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition-all duration-200 placeholder:text-gray-400";
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

    return (
        <div className="min-h-screen bg-[#F9F7F2] flex font-serif text-charcoal">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-[#EBE7DE] fixed h-full hidden md:flex flex-col z-20">
                <div className="p-8"><h1 className="text-2xl font-bold text-charcoal">Artisan Canvas</h1></div>
                <nav className="flex-1 px-4 space-y-2">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin" />
                    <SidebarItem icon={Package} label="Products" to="/admin/products" />
                    <SidebarItem icon={ShoppingCart} label="Orders" to="/admin/orders" />
                    <SidebarItem icon={Users} label="Customers" to="/admin/customers" />
                    <SidebarItem icon={Palette} label="Upload" active={true} to="/admin/upload" />
                    <SidebarItem icon={Settings} label="Settings" />
                </nav>
            </aside>

            <main className="flex-1 md:ml-64 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-end mb-8 border-b border-[#EBE7DE] pb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-charcoal">
                                {editModeProduct ? "Edit Masterpiece" : "Upload New Art"}
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Fill in the details to publish to the gallery.</p>
                        </div>
                    </div>
                    
                    {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md text-sm text-center font-medium border border-red-100">{error}</div>}

                    <form onSubmit={handleSubmit(submitHandler)} className="bg-white rounded-xl shadow-sm border border-[#EBE7DE] overflow-hidden">
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EBE7DE]">
                             
                             {/* --- LEFT COLUMN: IMAGES (Col Span 4) --- */}
                             <div className="p-8 lg:col-span-4 bg-gray-50/30">
                                <h3 className="text-sm font-bold text-charcoal mb-4">Visual Assets</h3>
                                
                                {/* 1. Main Image */}
                                <div className="mb-6">
                                    <label className={labelClass}>Main Hero Image *</label>
                                    <div className={`relative border-2 border-dashed rounded-lg transition-all duration-200 aspect-[3/4] flex flex-col items-center justify-center overflow-hidden ${mainPreview ? 'border-charcoal bg-white' : 'border-gray-300 hover:border-charcoal bg-white'}`}>
                                        {mainPreview ? (
                                            <img src={mainPreview} alt="Main" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                                <span className="text-xs text-gray-500">Upload Main View</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" {...register("image", { required: !editModeProduct })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    </div>
                                </div>

                                {/* 2. Gallery Images (3 Slots) */}
                                <div>
                                    <label className={labelClass}>Gallery Angles (Max 3)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[0, 1, 2].map((index) => (
                                            <div key={index} className="relative aspect-square border border-dashed border-gray-300 rounded-md bg-white hover:border-charcoal transition-colors flex items-center justify-center overflow-hidden group">
                                                {galleryPreviews[index] ? (
                                                    <>
                                                        <img src={galleryPreviews[index]} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeGalleryImage(index)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={12} className="text-red-500" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">+</span>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={(e) => handleGalleryChange(e, index)} 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">Recommended: Room View, Close-up, Side Angle.</p>
                                </div>
                             </div>

                             {/* --- RIGHT COLUMN: DETAILS (Col Span 8) --- */}
                             <div className="p-8 lg:col-span-8 space-y-6">
                                
                                {/* Row 1: Identity */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Artwork Title</label>
                                        <input {...register("title", { required: true })} className={inputClass} placeholder="e.g. Return home at Dusk" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Artist Name</label>
                                        <input {...register("artist", { required: true })} className={inputClass} placeholder="e.g. Elena Petrova" />
                                    </div>
                                    <div className="flex items-end pb-3">
                                        <label className="flex items-center space-x-2 cursor-pointer select-none group">
                                            <input type="checkbox" {...register("isFeatured")} className="w-5 h-5 border-gray-300 rounded text-charcoal focus:ring-charcoal" />
                                            <span className="text-sm font-medium text-gray-600 group-hover:text-charcoal transition-colors">Mark as Featured / Trending</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 my-2"></div>

                                {/* Row 2: Attributes */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className={labelClass}>Category</label>
                                        <select {...register("category", { required: true })} className={inputClass}>
                                            <option value="">Select...</option>
                                            <option value="Landscape">Landscape</option>
                                            <option value="Portrait">Portrait</option>
                                            <option value="Abstract">Abstract</option>
                                            <option value="Still Life">Still Life</option>
                                            <option value="Spiritual">Spiritual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Style</label>
                                        <select {...register("style")} className={inputClass}>
                                            <option value="">Select...</option>
                                            <option value="Realism">Realism</option>
                                            <option value="Impressionism">Impressionism</option>
                                            <option value="Modern">Modern</option>
                                            <option value="Traditional">Traditional</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Medium</label>
                                        <input {...register("medium")} placeholder="e.g. Acrylic" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Frame Status</label>
                                        <select {...register("frameStatus", { required: true })} className={inputClass}>
                                            <option value="Rolled (Unframed)">Rolled (Unframed)</option>
                                            <option value="Stretched">Stretched</option>
                                            <option value="With Frame">With Frame</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Dimensions */}
                                <div>
                                    <label className={labelClass}>Dimensions (Inches)</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <input {...register("width")} placeholder="Width" className={`${inputClass} pl-8`} />
                                            <span className="absolute left-3 top-3 text-gray-400 text-xs">W</span>
                                        </div>
                                        <div className="relative">
                                            <input {...register("height")} placeholder="Height" className={`${inputClass} pl-8`} />
                                            <span className="absolute left-3 top-3 text-gray-400 text-xs">H</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 my-2"></div>

                                {/* Row 4: Pricing (Dual Currency) */}
                                <div className="bg-[#F5F2EB] p-5 rounded-md border border-[#EBE7DE]">
                                    <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <IndianRupee size={14} /> Pricing & Inventory
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* INR */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold mb-1 block">Selling Price (INR)</label>
                                                <input {...register("pricein", { required: true })} type="number" className={inputClass} placeholder="₹ 0.00" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold mb-1 block">Discount % (INR)</label>
                                                <input {...register("discountin")} type="number" max="99" className={inputClass} placeholder="0%" />
                                            </div>
                                        </div>

                                        {/* USD */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold mb-1 block">Selling Price (USD)</label>
                                                <input {...register("priceusd", { required: true })} type="number" className={inputClass} placeholder="$ 0.00" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 font-bold mb-1 block">Discount % (USD)</label>
                                                <input {...register("discountusd")} type="number" max="99" className={inputClass} placeholder="0%" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 5: Description */}
                                <div>
                                    <label className={labelClass}>Description / Story</label>
                                    <textarea {...register("description")} rows="4" className={`${inputClass} resize-none`} placeholder="Tell the story behind this painting..." />
                                </div>
                                
                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button type="submit" disabled={loading} className="w-full bg-charcoal text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center rounded-sm shadow-md hover:shadow-lg">
                                        {loading ? <Loader2 className="animate-spin inline mr-2"/> : (editModeProduct ? "Update Masterpiece" : "Publish to Gallery")}
                                    </button>
                                </div>

                             </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};
export default AdminUpload;