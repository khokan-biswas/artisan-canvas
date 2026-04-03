import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import './App.css'

// Services & Store
import authService from './backend/auth'
import service from './backend/config'
import { login, logout } from './store/authSlice'
import { setCart } from './store/cartSlice'

// Components
import Header from './components/Header'
import Footer from './components/Footer'
import { Loader2 } from 'lucide-react'
import { HelmetProvider } from 'react-helmet-async';

function App() {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (userData) {
          dispatch(login(userData));

          const savedCart = localStorage.getItem('cart');
          if (savedCart) {
            try {
              const cartItems = JSON.parse(savedCart);
              if (Array.isArray(cartItems) && cartItems.length > 0) {
                dispatch(setCart(cartItems));
              }
            } catch {
              localStorage.removeItem('cart');
            }
          }

          // Restore from Appwrite cart if available for authenticated users
          try {
            const dbCart = await service.getCart(userData.$id);
            if (dbCart && dbCart.length > 0) {
              dispatch(setCart(dbCart));
            }
          } catch (dbError) {
//             console.warn('Failed to restore cart from Appwrite:', dbError);
          }
        } else {
          dispatch(logout());
        }
      } catch (err) {
//         console.log('Auth Check Failed:', err);
        dispatch(logout());
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <Loader2 className="animate-spin h-12 w-12 text-charcoal" />
      </div>
    )
  }

  return (
    <HelmetProvider>
      <div className="flex flex-col min-h-screen bg-cream font-sans text-charcoal overflow-x-hidden">
        <Header />
        <main className="flex-grow pb-36 md:pb-0">
          <Outlet />
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  )
}

export default App
