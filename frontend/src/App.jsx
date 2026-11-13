import React from 'react';
import { Capacitor } from '@capacitor/core';
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
import RateLimitBanner from './components/RateLimitBanner';
import PullToRefresh from './components/PullToRefresh';
import AuthModal from './components/AuthModal';

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
import DeliveryLogin from './pages/DeliveryLogin';
import DeliveryRegister from './pages/DeliveryRegister';
import DeliveryPartner from './pages/DeliveryPartner';

import './App.css';

const IS_RIDER_APP = import.meta.env.VITE_APP_MODE === 'rider';

const isRiderAccountUser = (u) =>
  Boolean(u?.isDeliveryPartner || u?.role === 'delivery_partner' || u?.isAdmin);

// Protected Route - For authenticated users only
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

// Admin Route - For admin users only (redirects to /admin/login)
const AdminRoute = ({ children }) => {
  const { token, user } = useAuth();
  return token && user?.isAdmin ? children : <Navigate to="/admin/login" replace />;
};

// Delivery Route - For delivery partners & admin only (redirects to /delivery/login)
const DeliveryRoute = ({ children }) => {
  const { token, user } = useAuth();
  const isDelivery = Boolean(token && isRiderAccountUser(user));
  return isDelivery ? children : <Navigate to="/delivery/login" replace />;
};

const RiderAppContent = () => {
  const { token, user, logout } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const isDeliveryAuthenticated = Boolean(token && isRiderAccountUser(user));

  // Clear non-rider sessions if somehow present in standalone Rider App
  React.useEffect(() => {
    if (token && user && !isRiderAccountUser(user)) {
      logout();
    }
  }, [token, user, logout]);

  return (
    <>
      <RateLimitBanner />
      <PullToRefresh />
      <AuthModal />
      {showSplash && (
        <SplashScreen
          onFinish={() => setShowSplash(false)}
          minDuration={800}
          maxTimeout={2500}
        />
      )}
      <main className="app-main-standalone">
        <Routes>
          <Route
            path="/delivery/login"
            element={isDeliveryAuthenticated ? <Navigate to="/delivery" replace /> : <DeliveryLogin />}
          />
          <Route
            path="/delivery/register"
            element={isDeliveryAuthenticated ? <Navigate to="/delivery" replace /> : <DeliveryRegister />}
          />
          <Route
            path="/delivery"
            element={
              <DeliveryRoute>
                <DeliveryPartner />
              </DeliveryRoute>
            }
          />
          <Route path="/register" element={<Navigate to="/delivery/register" replace />} />
          <Route path="/delivery-register" element={<Navigate to="/delivery/register" replace />} />
          <Route path="/delivery-login" element={<Navigate to="/delivery/login" replace />} />
          <Route path="/delivery-partner" element={<Navigate to="/delivery" replace />} />
          {/* Block all customer/admin storefront routes inside Rider App */}
          <Route
            path="*"
            element={<Navigate to={isDeliveryAuthenticated ? '/delivery' : '/delivery/login'} replace />}
          />
        </Routes>
      </main>
    </>
  );
};

const AppContent = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [showSplash, setShowSplash] = React.useState(true);

  const isStandalonePortal =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/delivery') ||
    location.pathname === '/admin-login' ||
    location.pathname === '/delivery-login';

  const isCheckoutPage = location.pathname === '/checkout';
  const isNativeMobileApp = Boolean(Capacitor?.isNativePlatform?.());

  React.useEffect(() => {
    document.body.classList.toggle('capacitor-native-app', isNativeMobileApp);
    return () => {
      document.body.classList.remove('capacitor-native-app');
    };
  }, [isNativeMobileApp]);

  if (IS_RIDER_APP) {
    return <RiderAppContent />;
  }

  return (
    <>
      <RateLimitBanner />
      <PullToRefresh />
      <AuthModal />
      {showSplash && (
        <SplashScreen 
          onFinish={() => setShowSplash(false)} 
          minDuration={IS_RIDER_APP ? 800 : 1800}
          maxTimeout={IS_RIDER_APP ? 2500 : 8500}
        />
      )}
      {!isStandalonePortal && <Navbar />}
      {!isStandalonePortal && <CartDrawer />}
      <main className={isStandalonePortal ? "app-main-standalone" : isCheckoutPage ? "app-main-checkout" : "app-main"}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={IS_RIDER_APP ? <Navigate to="/delivery" replace /> : <Home />} />
          <Route path="/products" element={IS_RIDER_APP ? <Navigate to="/delivery" replace /> : <Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/info/:slug" element={<InfoPage />} />
          
          {/* Dedicated Admin Portal Routes */}
          <Route path="/admin/login" element={token && user?.isAdmin ? <Navigate to="/admin" replace /> : <AdminLogin />} />
          <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* Dedicated Delivery Partner Fleet Routes */}
          <Route
            path="/delivery/login"
            element={
              token && (user?.isDeliveryPartner || user?.role === 'delivery_partner' || user?.isAdmin)
                ? <Navigate to="/delivery" replace />
                : <DeliveryLogin />
            }
          />
          <Route
            path="/delivery/register"
            element={
              token && (user?.isDeliveryPartner || user?.role === 'delivery_partner')
                ? <Navigate to="/delivery" replace />
                : <DeliveryRegister />
            }
          />
          <Route path="/delivery-login" element={<Navigate to="/delivery/login" replace />} />
          <Route
            path="/delivery"
            element={
              <DeliveryRoute>
                <DeliveryPartner />
              </DeliveryRoute>
            }
          />
          <Route path="/delivery-partner" element={<Navigate to="/delivery" replace />} />

          {/* Customer Auth Routes */}
          <Route
            path="/login"
            element={
              IS_RIDER_APP
                ? <Navigate to="/delivery/login" replace />
                : !token
                ? <Login />
                : <Navigate to={user?.isAdmin ? '/admin' : (user?.isDeliveryPartner ? '/delivery' : '/')} replace />
            }
          />
          <Route
            path="/register"
            element={
              IS_RIDER_APP
                ? <Navigate to="/delivery/register" replace />
                : !token
                ? <Register />
                : <Navigate to="/" replace />
            }
          />

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

          {/* Fallback */}
          <Route path="*" element={<Navigate to={IS_RIDER_APP ? '/delivery' : '/'} />} />
        </Routes>
      </main>
      {!isStandalonePortal && !isNativeMobileApp && <Footer />}
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
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '420px', margin: '0 0 20px 0' }}>
            {this.state.error?.message || 'An unexpected error occurred while loading this page. Please reload the page.'}
          </p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ background: '#0c831f', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
          >
            Reload Page
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
          {IS_RIDER_APP ? (
            <AppContent />
          ) : (
            <CartProvider>
              <WishlistProvider>
                <LocationProvider>
                  <AppContent />
                </LocationProvider>
              </WishlistProvider>
            </CartProvider>
          )}
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;