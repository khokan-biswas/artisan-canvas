import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import './App.css'

// Services & Store
import authService from './backend/auth'
import { login, logout } from './store/authSlice'

// Components
import Header from './components/Header'
import Footer from './components/Footer'
import { Loader2 } from 'lucide-react' // Optional: If you have lucide-react installed

function App() {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  // 🔄 RESTORE SESSION (Check if user is already logged in)
  useEffect(() => {
    authService.getCurrentUser()
      .then((userData) => {
        if (userData) {
          // User is logged in
          dispatch(login(userData))
        } else {
          // User is not logged in
          dispatch(logout())
        }
      })
      .catch((err) => {
          console.log("Auth Check Failed:", err);
          dispatch(logout());
      })
      .finally(() => setLoading(false))
  }, [dispatch])

  // Show a full-screen loader while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <Loader2 className="animate-spin h-12 w-12 text-charcoal" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream font-sans text-charcoal">
      {/* 1. Header (Sticks to top) */}
      <Header />

      {/* 2. Main Content (Changes based on Route) */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* 3. Footer (Sticks to bottom) */}
      <Footer />
    </div>
  )
}

export default App