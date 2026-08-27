import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import { ProtectedRoute } from './components/ProtectedRoute';
import useAuthStore from './store/authStore';

import Home from './pages/Home';
import Menu from './pages/Menu';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import OrderTracking from './pages/OrderTracking';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  // On boot, refresh user profile from server so navbar always shows current data
  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <CartDrawer />
        <div className="page-content">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={
              <div className="not-found">
                <h1>404</h1>
                <p>Page not found</p>
                <a href="/" className="btn btn-primary-sm">Go Home</a>
              </div>
            } />
          </Routes>
        </div>
        <Footer />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'Outfit, sans-serif', fontSize: '14px' },
          success: { iconTheme: { primary: '#D4A017', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
