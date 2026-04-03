import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import service from '../backend/config';
import {
    Loader2, UploadCloud, LayoutDashboard, Package, ShoppingCart,
    Users, Palette, Settings, IndianRupee, X
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

// --- Reusable UI Constants ---
const inputClass = (error) => `w-full bg-[#F9F7F2] border ${error ? 'border-red-500' : 'border-[#EBE7DE]'} text-charcoal p-3 rounded-sm focus:bg-white focus:border-charcoal focus:ring-1 focus:ring-charcoal outline-none transition-all duration-200 placeholder:text-gray-400`;
const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";

const SidebarItem = ({ icon: Icon, label, to = "#", active }) => (
    <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200 group ${active ? 'bg-[#EAE5D8] text-charcoal font-medium' : 'text-gray-500 hover:bg-[#F5F2EB] hover:text-charcoal'}`}>
        <Icon size={20} className={active ? 'text-charcoal' : 'text-gray-400 group-hover:text-charcoal'} />
        <span>{label}</span>
    </Link>
);

const AdminUpload = () => {
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [mainPreview, setMainPreview] = useState(null);
    const [galleryPreviews, setGalleryPreviews] = useState([null, null, null]);
    const [galleryFiles, setGalleryFiles] = useState([null, null, null]);

    const navigate = useNavigate();
    const location = useLocation();
    const editModeProduct = location.state?.product;

    // --- 1. Memory Cleanup ---
    useEffect(() => {
        return () => {
            // Clean up temporary URLs to prevent memory leaks
            if (mainPreview && mainPreview.startsWith('blob:')) URL.revokeObjectURL(mainPreview);
            galleryPreviews.forEach(p => {
                if (p && p.startsWith('blob:')) URL.revokeObjectURL(p);
            });
        };
    }, [mainPreview, galleryPreviews]);

    // --- 2. Load Data (Edit Mode) ---
    useEffect(() => {
        if (editModeProduct) {
            const fields = [
                'title', 'artist', 'category', 'medium', 'style',
                'shippingZone', 'width', 'height', 'description',
                'pricein', 'discountin', 'priceusd', 'discountusd', 'isFeatured', 'frameStatus'
            ];
            fields.forEach(field => setValue(field, editModeProduct[field]));

            if (editModeProduct.imageUrl) setMainPreview(editModeProduct.imageUrl);

            if (editModeProduct.gallery && Array.isArray(editModeProduct.gallery)) {
                const previews = [null, null, null];
                editModeProduct.gallery.forEach((url, i) => { if (i < 3) previews[i] = url; });
                setGalleryPreviews(previews);
            }
        }
    }, [editModeProduct, setValue]);

    // --- 3. Image Handlers ---
    const mainImageFile = watch('image');
    useEffect(() => {
        if (mainImageFile?.[0]) {
            const objectUrl = URL.createObjectURL(mainImageFile[0]);
            setMainPreview(objectUrl);
        }
    }, [mainImageFile]);

    const handleGalleryChange = (e, index) => {
        const file = e.target.files[0];
        if (file) {
            const newFiles = [...galleryFiles];
            newFiles[index] = file;
            setGalleryFiles(newFiles);

            const newPreviews = [...galleryPreviews];
            newPreviews[index] = URL.createObjectURL(file);
            setGalleryPreviews(newPreviews);
        }
    };

    const removeGalleryImage = (index) => {
        const newFiles = [...galleryFiles];
        const newPreviews = [...galleryPreviews];
        newFiles[index] = null;
        newPreviews[index] = null;
        setGalleryFiles(newFiles);
        setGalleryPreviews(newPreviews);
    };

    // --- 4. Optimization: Compression Helper ---
    const uploadHelper = async (file) => {
        if (!file) return null;
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true, fileType: "image/webp" };
        try {
            const compressed = await imageCompression(file, options);
            const response = await service.uploadFile(new File([compressed], file.name, { type: "image/webp" }));
            return service.getThumbnail(response.$id);
        } catch (err) {
            const response = await service.uploadFile(file);
            return service.getThumbnail(response.$id);
        }
    };

    // --- 5. Submit Logic ---
    const submitHandler = async (formData) => { // renamed to formData for clarity
        setLoading(true);
        setError(null);
        try {
            // 1. Separate the raw 'image' file input from the rest of the data
            const { image, ...restOfData } = formData;

            // 2. Process Main Image
            let mainImageUrl = editModeProduct?.imageUrl || null;
            if (image?.[0]) {
                mainImageUrl = await uploadHelper(image[0]);
            }

            // 3. Process Gallery (Mapping slots)
            const galleryPromises = galleryFiles.map(async (file, i) => {
                if (file) return await uploadHelper(file);
                return galleryPreviews[i] && galleryPreviews[i].startsWith('http') ? galleryPreviews[i] : null;
            });
            const uploadedGallery = (await Promise.all(galleryPromises)).filter(Boolean);

            // 4. Construct Payload using 'restOfData' instead of 'formData'
            const payload = {
                ...restOfData, // ✅ No 'image' field here anymore
                imageUrl: mainImageUrl,
                gallery: uploadedGallery,
                pricein: parseFloat(formData.pricein) || 0,
                priceusd: parseFloat(formData.priceusd) || 0,
                discountin: parseFloat(formData.discountin) || 0,
                discountusd: parseFloat(formData.discountusd) || 0,
                isSold: editModeProduct ? Boolean(editModeProduct.isSold) : false,
            };

            if (editModeProduct) {
                await service.updatePainting(editModeProduct.$id, payload);
            } else {
                await service.createPainting(payload);
            }
            navigate('/admin/products');
        } catch (err) {
//             console.error("Full Error:", err);
            setError(err.message || "Failed to save product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F7F2] flex font-serif text-charcoal">
            <aside className="w-64 bg-white border-r border-[#EBE7DE] fixed h-full hidden md:flex flex-col z-20">
                <div className="p-8"><h1 className="text-2xl font-bold text-charcoal">Adhunic Art</h1></div>
                <nav className="flex-1 px-4 space-y-2">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/admin" />
                    <SidebarItem icon={Package} label="Products" to="/admin/products" />
                    <SidebarItem icon={ShoppingCart} label="Orders" to="/admin/orders" />
                    <SidebarItem icon={Users} label="Customers" to="/admin/customers" />
                    <SidebarItem icon={Palette} label="Upload" active={true} to="/admin/upload" />
                    <SidebarItem icon={Settings} label="Settings" to="/admin/settings" />
                </nav>
            </aside>

            <main className="flex-1 md:ml-64 p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8 border-b border-[#EBE7DE] pb-4">
                        <h1 className="text-3xl font-bold">{editModeProduct ? "Edit Masterpiece" : "Upload New Art"}</h1>
                        <p className="text-gray-500 text-sm mt-1">Fill in the details to publish to the gallery.</p>
                    </div>

                    {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100 text-center text-sm">{error}</div>}

                    <form onSubmit={handleSubmit(submitHandler)} className="bg-white rounded-xl shadow-sm border border-[#EBE7DE] overflow-hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EBE7DE]">

                            {/* LEFT: Visuals */}
                            <div className="p-8 lg:col-span-4 bg-gray-50/30">
                                <h3 className="text-sm font-bold mb-4">Visual Assets</h3>
                                <div className="mb-6">
                                    <label className={labelClass}>Main Hero Image *</label>
                                    <div className={`relative border-2 border-dashed rounded-lg aspect-[3/4] flex items-center justify-center overflow-hidden transition-all ${mainPreview ? 'border-charcoal' : 'border-gray-300 hover:border-charcoal'}`}>
                                        {mainPreview ? <img src={mainPreview} className="w-full h-full object-cover" alt="Hero" /> : (
                                            <div className="text-center"><UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" /><span className="text-xs text-gray-500">Upload Front View</span></div>
                                        )}
                                        <input type="file" accept="image/*" {...register("image", { required: !editModeProduct })} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    {errors.image && <p className="text-red-500 text-[10px] mt-1">Main image is required</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>Gallery Angles (Max 3)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} className="relative aspect-square border border-dashed border-gray-300 rounded-md bg-white hover:border-charcoal overflow-hidden group flex items-center justify-center">
                                                {galleryPreviews[i] ? (
                                                    <>
                                                        <img src={galleryPreviews[i]} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                                        <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} className="text-red-500" /></button>
                                                    </>
                                                ) : <span className="text-xs text-gray-400">+</span>}
                                                <input type="file" accept="image/*" onChange={(e) => handleGalleryChange(e, i)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Details */}
                            <div className="p-8 lg:col-span-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Artwork Title</label>
                                        <input {...register("title", { required: true })} className={inputClass(errors.title)} placeholder="e.g. Return home at Dusk" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Artist Name</label>
                                        <input {...register("artist", { required: true })} className={inputClass(errors.artist)} placeholder="Artist Name" />
                                    </div>
                                    <div className="flex items-center pb-3">
                                        <label className="flex items-center space-x-2 cursor-pointer group">
                                            <input type="checkbox" {...register("isFeatured")} className="w-5 h-5 rounded text-charcoal" />
                                            <span className="text-sm font-medium text-gray-600 group-hover:text-charcoal transition-colors">Mark as Featured</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><label className={labelClass}>Category</label>
                                        <select {...register("category", { required: true })} className={inputClass(errors.category)}>
                                            <option value="Landscape">Landscape</option>
                                            <option value="Portrait">Portrait</option>
                                            <option value="Abstract">Abstract</option>
                                            <option value="Still Life">Still Life</option>
                                            <option value="Spiritual">Spiritual / Religious</option>
                                            <option value="Contemporary">Contemporary</option>
                                            <option value="Wildlife">Wildlife & Nature</option>
                                            <option value="Seascape">Seascape / Nautical</option>
                                            <option value="Urban">Urban / Cityscape</option>
                                            <option value="Figurative">Figurative</option>
                                            <option value="Minimalist">Minimalist</option>
                                            <option value="Surrealism">Surrealism</option>
                                            <option value="Mythological">Mythological</option>
                                            <option value="Tribal">Tribal / Folk Art</option>
                                            <option value="Calligraphy">Calligraphy</option>
                                            <option value="Botanical">Botanical</option>
                                        </select>
                                    </div>
                                    <div><label className={labelClass}>Style</label>
                                        <select {...register("style")} className={inputClass()}>
                                            <option value="Realism">Realism</option>
                                            <option value="Impressionism">Impressionism</option>
                                            <option value="Modern">Modern</option>
                                            <option value="Traditional">Traditional</option>
                                        </select>
                                    </div>
                                    <div><label className={labelClass}>Medium</label><input {...register("medium")} placeholder="e.g. Acrylic" className={inputClass()} /></div>
                                    <div><label className={labelClass}>Frame Status</label>
                                        <select {...register("frameStatus", { required: true })} className={inputClass()}>
                                            <option value="Rolled (Unframed)">Rolled (Unframed)</option>
                                            <option value="Stretched">Stretched</option>
                                            <option value="With Frame">With Frame</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative"><label className={labelClass}>Width (in)</label><input {...register("width")} className={inputClass()} placeholder="0" /></div>
                                    <div className="relative"><label className={labelClass}>Height (in)</label><input {...register("height")} className={inputClass()} placeholder="0" /></div>
                                </div>

                                <div className="bg-[#F5F2EB] p-5 rounded-md border border-[#EBE7DE] grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold flex items-center gap-1"><IndianRupee size={12} /> Pricing (INR)</label>
                                        <input {...register("pricein", { required: true })} type="number" className={inputClass(errors.pricein)} placeholder="Base Price" />
                                        <input {...register("discountin")} type="number" className={inputClass()} placeholder="Discount %" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold flex items-center gap-1">$ Pricing (USD)</label>
                                        <input {...register("priceusd", { required: true })} type="number" className={inputClass(errors.priceusd)} placeholder="Base Price" />
                                        <input {...register("discountusd")} type="number" className={inputClass()} placeholder="Discount %" />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Description / Story</label>
                                    <textarea {...register("description")} rows="4" className={`${inputClass()} resize-none`} placeholder="Tell the story behind this painting..." />
                                </div>

                                <button type="submit" disabled={loading} className="w-full bg-charcoal text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center rounded-sm shadow-md">
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : (editModeProduct ? "Update Masterpiece" : "Publish to Gallery")}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default AdminUpload;
