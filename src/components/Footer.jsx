import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand & About */}
          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
              Artisan<span className="text-yellow-500">Canvas</span>
            </h2>
            <p className="text-sm leading-relaxed">
              Curating unique, one-of-a-kind paintings from independent artists. 
              Bring the beauty of original art into your home.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-serif font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-yellow-500 transition">Home</Link></li>
              <li><Link to="/shop" className="hover:text-yellow-500 transition">Shop All Art</Link></li>
              <li><Link to="/about" className="hover:text-yellow-500 transition">About Us</Link></li>
              <li><Link to="/admin/upload" className="hover:text-yellow-500 transition">Artist Login</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Support */}
          <div>
            <h3 className="text-white font-serif font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-yellow-500 transition">FAQ</Link></li>
              <li><Link to="/about" className="hover:text-yellow-500 transition">Shipping & Returns</Link></li>
              <li><Link to="/about" className="hover:text-yellow-500 transition">Privacy Policy</Link></li>
              <li><Link to="/about" className="hover:text-yellow-500 transition">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div>
            <h3 className="text-white font-serif font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-yellow-500" />
                <span>Krishnanagar, Nadia, West bengal, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-yellow-500" />
                <span>+91 9072280064</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-yellow-500" />
                <span>khokanbiswasofficial@gmail.com</span>
              </li>
            </ul>
            
            {/* Social Icons */}
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-400 hover:text-white transition"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition"><Twitter className="h-5 w-5" /></a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Artisan Canvas. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;