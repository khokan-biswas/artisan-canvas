import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({ children, authentication = true, adminOnly = false }) {
  const navigate = useNavigate();
  const [loader, setLoader] = useState(true);
  
  const authStatus = useSelector(state => state.auth.status);
  const userData = useSelector(state => state.auth.userData);

  // 👇 ADMIN CHECK LOGIC
  // Replace this with your exact admin email if it changes
  const ADMIN_EMAIL = "s9618137@gmail.com";
  const isAdmin = userData?.email === ADMIN_EMAIL;

  useEffect(() => {
    // 1. Check Login Status
    // If page requires auth (authentication=true) but user is NOT logged in
    if (authentication && authStatus !== authentication) {
      navigate("/login");
    } 
    // If page is for guests (authentication=false) but user IS logged in (e.g., trying to view Login page)
    else if (!authentication && authStatus !== authentication) {
      navigate("/");
    }
    // 2. Check Admin Privilege
    // If page is Admin Only, but user is NOT an admin
    else if (adminOnly && !isAdmin) {
      navigate("/"); // Kick normal users to Home
    }
    
    setLoader(false);
  }, [authStatus, navigate, authentication, adminOnly, isAdmin]);

  return loader ? (
    <div className="h-screen flex justify-center items-center bg-cream">
        <Loader2 className="animate-spin h-10 w-10 text-charcoal"/>
    </div> 
  ) : <>{children}</>;
}