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

function App() {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  useEffect(() => {
    authService.getCurrentUser()
      .then((userData) => {
        if (userData) {
          dispatch(login(userData));

          // 🔄 RESTORE CART: Fetch from DB whenever user session is restored on refresh
          service.getCart(userData.$id).then((dbCart) => {
              if (dbCart && dbCart.length > 0) {
                  dispatch(setCart(dbCart));
              }
          });
          
        } else {
          dispatch(logout())
        }
      })
      .catch((err) => {
          console.log("Auth Check Failed:", err);
          dispatch(logout());
      })
      .finally(() => setLoading(false))
  }, [dispatch])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <Loader2 className="animate-spin h-12 w-12 text-charcoal" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream font-sans text-charcoal">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default App