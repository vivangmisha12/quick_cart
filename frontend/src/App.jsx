import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { LocationProvider } from './context/LocationContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import MobileBottomNav from './components/MobileBottomNav';
import SplashScreen from './components/SplashScreen';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
// Resilient lazy load for Checkout to prevent any HMR or export boundary white screens
const Checkout = React.lazy(() =>
  import('./pages/Checkout').then(m => ({ default: m.default || m.Checkout }))
);
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetails from './pages/ProductDetails';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import Orders from './pages/Orders';
import Addresses from './pages/Addresses';
import InfoPage from './pages/InfoPage';
import AdminLogin from './pages/AdminLogin';
import DeliveryPartner from './pages/DeliveryPartner';

import './App.css';

// Protected Route - For authenticated users only
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};



// Admin Route - For admin users only
const AdminRoute = ({ children }) => {
  const { token, user } = useAuth();
  return token && user?.isAdmin ? children : <Navigate to="/login" />;
};


const AppContent = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [showSplash, setShowSplash] = React.useState(true);

  const isStandalonePortal = 
    location.pathname.startsWith('/admin') || 
    location.pathname.startsWith('/delivery');

  return (
    <>
      {showSplash && (
        <SplashScreen 
          onFinish={() => setShowSplash(false)} 
          minDuration={1800}
          maxTimeout={5500}
        />
      )}
      {!isStandalonePortal && <Navbar />}
      {!isStandalonePortal && <CartDrawer />}
      <main className={isStandalonePortal ? "app-main-standalone" : "app-main"}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/info/:slug" element={<InfoPage />} />
          
          {/* Dedicated Delivery Partner Fleet Route */}
          <Route path="/delivery" element={<DeliveryPartner />} />
          <Route path="/delivery-partner" element={<DeliveryPartner />} />

          {/* Dedicated Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Customer Auth Routes */}
          <Route path="/login" element={!token ? <Login /> : <Navigate to={user?.isAdmin ? '/admin' : '/'} />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to={user?.isAdmin ? '/admin' : '/'} />} />

          {/* Protected Routes */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <React.Suspense fallback={
                  <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTop: '3px solid #0c831f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <p style={{ color: '#0c831f', fontWeight: 600 }}>Loading checkout...</p>
                  </div>
                }>
                  <Checkout />
                </React.Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/addresses"
            element={
              <ProtectedRoute>
                <Addresses />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {!isStandalonePortal && <Footer />}
      {!isStandalonePortal && <MobileBottomNav />}
    </>
  );
};

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Progicart ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <img src="/logo.png" alt="Progicart" style={{ height: '52px', objectFit: 'contain', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>Kuch gadbad hui (Something went wrong)</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '420px', margin: '0 0 20px 0' }}>
            {this.state.error?.message || 'Page render karte waqt samasya aayi. Kripya page reload karein.'}
          </p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ background: '#0c831f', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
          >
            Page Reload Karein
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <LocationProvider>
                <AppContent />
              </LocationProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;