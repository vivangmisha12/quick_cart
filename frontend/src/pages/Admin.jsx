import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Package, 
  Image as ImageIcon, 
  ShoppingBag, 
  Users, 
  ExternalLink,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Truck,
  LogOut,
  Clock,
  Search,
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Navigation,
  DollarSign
} from 'lucide-react';
import CategoryManagement from '../components/CategoryManagement';
import ProductManagement from '../components/ProductManagement';
import BannerManagement from '../components/BannerManagement';
import OrderManagement from '../components/OrderManagement';
import { adminCategoriesAPI, adminProductsAPI, adminOrdersAPI, adminUsersAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Admin.css';

const MOCK_RIDERS = [
  { id: 'r1', name: 'Suresh Kumar', phone: '9876543210', vehicle: 'UP-32-BK-2024', status: 'On Delivery', activeOrder: 'ORD-8941', battery: '92%' },
  { id: 'r2', name: 'Rahul Verma', phone: '9876543211', vehicle: 'UP-32-BK-1102', status: 'At Dark Store', activeOrder: 'Available', battery: '85%' },
  { id: 'r3', name: 'Amit Singh', phone: '9876543212', vehicle: 'UP-32-BK-3390', status: 'Packing Bag', activeOrder: 'ORD-8944', battery: '78%' },
  { id: 'r4', name: 'Vikram Patel', phone: '9876543213', vehicle: 'UP-32-BK-4512', status: 'At Dark Store', activeOrder: 'Available', battery: '95%' },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [liveOrdersCount, setLiveOrdersCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Keep live clock updated
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-app-wrapper">
      {/* Top Admin Dashboard Navigation Bar */}
      <header className="admin-top-navbar">
        <div className="admin-header-left">
          <div className="admin-brand-lockup">
            <div className="admin-logo-badge-wrap">
              <img src="/logo.png" alt="Progicart" className="admin-header-logo-img" />
            </div>
            <span className="hub-badge">Admin Hub</span>
          </div>

          <div className="dark-store-indicator">
            <span className="pulse-green-dot"></span>
            <span>Dark Store #04 • Vibhuti Khand, Lucknow (Online)</span>
          </div>

          <div className="admin-clock-pill">
            <Clock size={13} />
            <span>{currentTime}</span>
          </div>
        </div>

        <div className="admin-header-right">
          {/* Quick metric chips */}
          <button 
            type="button" 
            className="header-metric-pill"
            onClick={() => setActiveTab('orders')}
            title="View Live Orders"
          >
            <span className="pill-dot orange"></span>
            <span>Orders Queue: <strong>{liveOrdersCount}</strong></span>
          </button>

          <button 
            type="button" 
            className="header-metric-pill"
            onClick={() => setActiveTab('riders')}
            title="View Fleet Status"
          >
            <span className="pill-dot green"></span>
            <span>Active Riders: <strong>4 Online</strong></span>
          </button>

          {/* External Navigation Shortcuts */}
          <Link to="/delivery" target="_blank" rel="noopener noreferrer" className="external-portal-btn">
            <Truck size={14} />
            <span>Rider Portal</span>
            <ExternalLink size={12} />
          </Link>

          <Link to="/" target="_blank" rel="noopener noreferrer" className="external-portal-btn storefront">
            <span>Live Storefront</span>
            <ExternalLink size={12} />
          </Link>

          {/* Admin Profile & Logout */}
          <div className="admin-user-menu">
            <div className="admin-avatar-circle">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="admin-info-text">
              <span className="admin-name">{user?.name || 'Super Admin'}</span>
              <span className="admin-role">Store Manager</span>
            </div>
            <button 
              type="button" 
              className="admin-logout-btn" 
              onClick={handleLogout}
              title="Logout from Admin Portal"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Right Workspace */}
      <div className="admin-body-layout">
        {/* Left Sidebar */}
        <aside className="admin-sidebar-nav">
          <div className="sidebar-group-label">OPERATIONS & DISPATCH</div>
          <nav className="sidebar-menu">
            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Store Overview</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <ShoppingBag size={18} />
              <span>Orders & Dispatch</span>
              {liveOrdersCount > 0 && <span className="sidebar-counter-badge">{liveOrdersCount}</span>}
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'riders' ? 'active' : ''}`}
              onClick={() => setActiveTab('riders')}
            >
              <Truck size={18} />
              <span>Rider Fleet Monitor</span>
              <span className="sidebar-counter-badge green">4</span>
            </button>
          </nav>

          <div className="sidebar-group-label">CATALOG & MARKETING</div>
          <nav className="sidebar-menu">
            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package size={18} />
              <span>Products Catalog</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              <Layers size={18} />
              <span>Categories & Shelves</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'banners' ? 'active' : ''}`}
              onClick={() => setActiveTab('banners')}
            >
              <ImageIcon size={18} />
              <span>Promo Banners</span>
            </button>
          </nav>

          {/* Quick info at bottom of sidebar */}
          <div className="sidebar-bottom-info">
            <div className="dark-store-card-small">
              <span className="store-title">🏪 Dark Store #04</span>
              <span className="store-sub">Instant 10-Min Delivery Radius</span>
              <span className="store-eta">Avg Dispatch: <strong>2.8 mins</strong></span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Content */}
        <main className="admin-main-workspace">
          {activeTab === 'dashboard' && (
            <AdminDashboard 
              onSwitchTab={setActiveTab} 
              onUpdateLiveCount={setLiveOrdersCount} 
            />
          )}
          {activeTab === 'orders' && <OrderManagement />}
          {activeTab === 'riders' && <RiderFleetMonitor onSwitchTab={setActiveTab} />}
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'categories' && <CategoryManagement />}
          {activeTab === 'banners' && <BannerManagement />}
        </main>
      </div>
    </div>
  );
};

/* =========================================================================
   DASHBOARD OVERVIEW COMPONENT (KPIs + Live Order Stream + Quick Actions)
   ========================================================================= */
const AdminDashboard = ({ onSwitchTab, onUpdateLiveCount }) => {
  const [stats, setStats] = useState({ categories: 0, products: 0, orders: 0, users: 0, totalRevenue: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatsAndOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, prodRes, orderRes, userRes] = await Promise.all([
        adminCategoriesAPI.getAll(),
        adminProductsAPI.getAll(),
        adminOrdersAPI.getAll(),
        adminUsersAPI.getCount(),
      ]);

      const allOrders = orderRes.data || [];
      const revenue = allOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const activePending = allOrders.filter(o => ['pending', 'confirmed', 'packing', 'out_for_delivery'].includes(o.status));

      if (onUpdateLiveCount) {
        onUpdateLiveCount(activePending.length);
      }

      setStats({
        categories: catRes.data?.length ?? 0,
        products: prodRes.data?.length ?? 0,
        orders: allOrders.length,
        users: userRes.data?.count ?? 0,
        totalRevenue: revenue,
        activeOrdersCount: activePending.length
      });

      setRecentOrders(allOrders.slice(0, 6));
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Unable to fetch live store analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndOrders();
    const interval = setInterval(fetchStatsAndOrders, 10000); // 10s auto refresh
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="status-chip chip-blue">✓ Confirmed</span>;
      case 'packing':
        return <span className="status-chip chip-yellow">📦 Packing</span>;
      case 'picked_up':
        return <span className="status-chip chip-purple">🏍️ Picked Up</span>;
      case 'out_for_delivery':
        return <span className="status-chip chip-orange">⚡ Out for Delivery</span>;
      case 'delivered':
        return <span className="status-chip chip-green">✓✓ Delivered</span>;
      case 'cancelled':
        return <span className="status-chip chip-red">✕ Cancelled</span>;
      default:
        return <span className="status-chip chip-gray">{status}</span>;
    }
  };

  return (
    <div className="dashboard-content-container">
      {/* Title & Refresh Strip */}
      <div className="workspace-header-bar">
        <div>
          <h1 className="workspace-title">Dark Store Control Center</h1>
          <p className="workspace-subtitle">
            Real-time live monitoring of customer orders, dispatch queue, catalog & delivery fleet
          </p>
        </div>

        <button 
          type="button" 
          className="refresh-dashboard-btn" 
          onClick={fetchStatsAndOrders} 
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
          <span>{loading ? 'Syncing...' : 'Sync Live Data'}</span>
        </button>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      {/* 4 Top KPI Cards Grid */}
      <div className="kpi-metrics-grid">
        {/* Metric 1: Revenue / GMV */}
        <div className="kpi-card" onClick={() => onSwitchTab('orders')}>
          <div className="kpi-top-row">
            <span className="kpi-title">Gross Revenue (GMV)</span>
            <div className="kpi-icon-box green">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">
              ₹{loading ? '…' : stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="kpi-trend positive">+18.4% live</span>
          </div>
          <span className="kpi-footer-sub">Total sales volume in dark store</span>
        </div>

        {/* Metric 2: Live Orders Queue */}
        <div className="kpi-card" onClick={() => onSwitchTab('orders')}>
          <div className="kpi-top-row">
            <span className="kpi-title">Orders in Queue</span>
            <div className="kpi-icon-box orange">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number text-orange">
              {loading ? '…' : stats.activeOrdersCount ?? 0}
            </span>
            <span className="kpi-trend alert">⚡ Needs dispatch</span>
          </div>
          <span className="kpi-footer-sub">Total {stats.orders} lifetime orders placed</span>
        </div>

        {/* Metric 3: Products Catalog */}
        <div className="kpi-card" onClick={() => onSwitchTab('products')}>
          <div className="kpi-top-row">
            <span className="kpi-title">Products in Dark Store</span>
            <div className="kpi-icon-box blue">
              <Package size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">
              {loading ? '…' : stats.products}
            </span>
            <span className="kpi-trend neutral">Across {stats.categories} Shelves</span>
          </div>
          <span className="kpi-footer-sub">Active grocery inventory</span>
        </div>

        {/* Metric 4: Active Delivery Riders */}
        <div className="kpi-card" onClick={() => onSwitchTab('riders')}>
          <div className="kpi-top-row">
            <span className="kpi-title">Active Fleet (Riders)</span>
            <div className="kpi-icon-box yellow">
              <Truck size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">4 Riders</span>
            <span className="kpi-trend positive">🟢 100% Online</span>
          </div>
          <span className="kpi-footer-sub">Avg instant delivery ETA: 10-12 mins</span>
        </div>
      </div>

      {/* Main Split: Real-Time Live Order Stream (Left) + Quick Actions & Fleet Widget (Right) */}
      <div className="dashboard-split-layout">
        {/* Left Column: Live Orders Feed */}
        <div className="dashboard-widget-card">
          <div className="widget-header">
            <div className="widget-header-title">
              <Activity size={18} className="text-green" />
              <h3>Live Customer Orders Stream</h3>
              <span className="live-pulse-badge">REAL-TIME</span>
            </div>
            <button 
              type="button" 
              className="widget-action-btn"
              onClick={() => onSwitchTab('orders')}
            >
              <span>View All Orders</span>
              <ExternalLink size={13} />
            </button>
          </div>

          <div className="orders-table-wrapper">
            <table className="admin-orders-stream-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Customer & Area</th>
                  <th>Items & Price</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
                      No customer orders recorded yet. Place an order on the storefront to test!
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord._id}>
                      <td className="mono-code">
                        <strong>#{ord._id.slice(-6).toUpperCase()}</strong>
                        <span className="time-sub">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td>
                        <strong className="customer-name">{ord.userId?.name || 'Customer'}</strong>
                        <span className="area-text">
                          📍 {ord.shippingAddress?.street?.slice(0, 22) || 'Lucknow'}...
                        </span>
                      </td>

                      <td>
                        <span className="item-count-text">{ord.items?.length || 1} items</span>
                        <strong className="price-text">₹{ord.totalPrice?.toFixed(2)}</strong>
                      </td>

                      <td>
                        <span className={`payment-pill ${ord.paymentMethod === 'razorpay' ? 'online' : 'cod'}`}>
                          {ord.paymentMethod === 'razorpay' ? 'Razorpay' : 'COD'}
                        </span>
                      </td>

                      <td>
                        {getStatusBadge(ord.status)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="table-dispatch-btn"
                          onClick={() => onSwitchTab('orders')}
                        >
                          Dispatch
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Fleet Live Widget & Operations */}
        <div className="dashboard-side-widgets">
          {/* Active Fleet Widget */}
          <div className="dashboard-widget-card compact">
            <div className="widget-header">
              <div className="widget-header-title">
                <Truck size={17} className="text-blue" />
                <h3>Dark Store Delivery Fleet</h3>
              </div>
              <button 
                type="button" 
                className="widget-action-btn"
                onClick={() => onSwitchTab('riders')}
              >
                <span>Manage</span>
              </button>
            </div>

            <div className="rider-mini-list">
              {MOCK_RIDERS.map((r) => (
                <div key={r.id} className="rider-mini-card">
                  <div className="rider-avatar-icon">🛵</div>
                  <div className="rider-mini-info">
                    <strong>{r.name}</strong>
                    <span>{r.vehicle} • Bat: {r.battery}</span>
                  </div>
                  <div className="rider-mini-status">
                    <span className={`rider-badge ${r.status === 'On Delivery' ? 'busy' : 'available'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Operations Shortcuts */}
          <div className="dashboard-widget-card compact">
            <div className="widget-header">
              <div className="widget-header-title">
                <Zap size={17} className="text-yellow" />
                <h3>Quick Dark Store Actions</h3>
              </div>
            </div>

            <div className="quick-action-tiles-grid">
              <button 
                type="button" 
                className="action-tile"
                onClick={() => onSwitchTab('products')}
              >
                <div className="tile-icon-box green">
                  <PlusCircle size={18} />
                </div>
                <div>
                  <strong>Add New Product</strong>
                  <span>Stock & Pricing</span>
                </div>
              </button>

              <button 
                type="button" 
                className="action-tile"
                onClick={() => onSwitchTab('categories')}
              >
                <div className="tile-icon-box yellow">
                  <Layers size={18} />
                </div>
                <div>
                  <strong>Manage Shelves</strong>
                  <span>Category collections</span>
                </div>
              </button>

              <button 
                type="button" 
                className="action-tile"
                onClick={() => onSwitchTab('banners')}
              >
                <div className="tile-icon-box blue">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <strong>Promo Banners</strong>
                  <span>Homepage highlights</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   RIDER FLEET MONITOR TAB
   ========================================================================= */
const RiderFleetMonitor = ({ onSwitchTab }) => {
  return (
    <div className="fleet-monitor-container">
      <div className="workspace-header-bar">
        <div>
          <h1 className="workspace-title">Rider Fleet & Dispatch Tracking</h1>
          <p className="workspace-subtitle">
            Live delivery partner locations, task assignments, vehicle numbers and battery health
          </p>
        </div>

        <Link to="/delivery" target="_blank" rel="noopener noreferrer" className="launch-rider-app-btn">
          <Truck size={16} />
          <span>Launch Rider App Simulation</span>
          <ExternalLink size={14} />
        </Link>
      </div>

      <div className="fleet-grid">
        {MOCK_RIDERS.map((rider) => (
          <div key={rider.id} className="fleet-rider-card">
            <div className="fleet-card-top">
              <div className="rider-main-badge">
                <div className="rider-pic">🛵</div>
                <div>
                  <h3>{rider.name}</h3>
                  <span className="rider-phone">📞 {rider.phone}</span>
                </div>
              </div>

              <span className={`status-pill ${rider.status === 'On Delivery' ? 'on-job' : 'ready'}`}>
                {rider.status}
              </span>
            </div>

            <div className="fleet-card-details">
              <div className="detail-row">
                <span className="label">Vehicle:</span>
                <span className="val bold">{rider.vehicle}</span>
              </div>
              <div className="detail-row">
                <span className="label">Active Order:</span>
                <span className="val mono text-blue">{rider.activeOrder}</span>
              </div>
              <div className="detail-row">
                <span className="label">Device Battery:</span>
                <span className="val text-green">{rider.battery}</span>
              </div>
              <div className="detail-row">
                <span className="label">Assigned Hub:</span>
                <span className="val">Dark Store #04 • Vibhuti Khand</span>
              </div>
            </div>

            <div className="fleet-card-actions">
              <button 
                type="button" 
                className="btn-assign-order"
                onClick={() => onSwitchTab('orders')}
              >
                Assign Order from Queue
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
