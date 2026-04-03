import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from 'react-redux';
import store from './store/store.js';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// import conf from './conf/conf.js'; // Not needed here anymore for PayPal
// import { PayPalScriptProvider } from "@paypal/react-paypal-js"; // REMOVE THIS

import AuthLayout from './components/AuthLayout.jsx';
import UserDetails from './pages/UserDetails.jsx';

// ... (Keep all your Lazy Imports and PageLoader as they were) ...
const HomePage = React.lazy(() => import('./pages/HomePage.jsx'));
const Login = React.lazy(() => import('./pages/Login.jsx'));
const Signup = React.lazy(() => import('./pages/Signup.jsx'));
const Shop = React.lazy(() => import('./pages/Shop.jsx'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails.jsx'));
const Checkout = React.lazy(() => import('./pages/Checkout.jsx'));
const AdminUpload = React.lazy(() => import('./pages/AdminUpload.jsx'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminProducts = React.lazy(() => import('./pages/AdminProducts.jsx'));
const AdminOrders = React.lazy(() => import('./pages/AdminOders.jsx'));
const AdminCustomers = React.lazy(() => import('./pages/AdminCustomers.jsx'));
const AdminSettings = React.lazy(() => import('./pages/AdminSettings.jsx'));
const Orders = React.lazy(() => import('./pages/Oders.jsx'));


const About = () => (
  <div className="min-h-screen bg-[#FDFBF7] px-4 py-12">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-serif text-charcoal mb-6">About Adhunic Art</h1>
      <p className="text-gray-600 text-lg leading-relaxed mb-4">
        Welcome to Adhunic Art, your destination for curated fine art and contemporary paintings.
      </p>
      <p className="text-gray-600 text-lg leading-relaxed">
        We believe in supporting artists and bringing exceptional artwork into homes and spaces worldwide.
      </p>
    </div>
  </div>
);

const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
    <div className="animate-spin h-10 w-10 border-4 border-charcoal border-t-transparent rounded-full"></div>
  </div>
);

// (Router configuration remains exactly the same)
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // ... all your existing routes ...
      {
        path: "/",
        element: <Suspense fallback={<PageLoader />}><HomePage /></Suspense>
      },
      {
        path: "/shop",
        element: <Suspense fallback={<PageLoader />}><Shop /></Suspense>
      },
      { path: "/about", element: <About /> },
      {
        path: "/product/:slug",
        element: <Suspense fallback={<PageLoader />}><ProductDetails /></Suspense>
      },
      {
        path: "/login",
        element: <AuthLayout authentication={false}><Suspense fallback={<PageLoader />}><Login /></Suspense></AuthLayout>
      },
      {
        path: "/signup",
        element: <AuthLayout authentication={false}><Suspense fallback={<PageLoader />}><Signup /></Suspense></AuthLayout>
      },
      {
        path: "/checkout",
        element: <AuthLayout authentication={true}><Suspense fallback={<PageLoader />}><Checkout /></Suspense></AuthLayout>
      },
      {
        path: "/user-details",
        element: <AuthLayout authentication={true}><Suspense fallback={<PageLoader />}><UserDetails/> </Suspense></AuthLayout>
      },
      {
        path: "/orders",
        element: <AuthLayout authentication={true}><Suspense fallback={<PageLoader />}><Orders /></Suspense></AuthLayout>
      },
      // ... Admin routes ...
      { path: "/admin", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></AuthLayout> },
      { path: "/admin/dashboard", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></AuthLayout> },
      { path: "/admin/upload", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminUpload /></Suspense></AuthLayout> },
      { path: "/admin/products", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminProducts /></Suspense></AuthLayout> },
      { path: "/admin/orders", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminOrders /></Suspense></AuthLayout> },
      { path: "/admin/customers", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminCustomers /></Suspense></AuthLayout> },
      { path: "/admin/settings", element: <AuthLayout authentication={true} adminOnly={true}><Suspense fallback={<PageLoader />}><AdminSettings /></Suspense></AuthLayout> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* 👇 PayPal Removed. Router is direct child of Provider */}
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
);