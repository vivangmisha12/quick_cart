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
  DollarSign,
  UserPlus,
  Mail,
  MapPin,
  X
} from 'lucide-react';
import CategoryManagement from '../components/CategoryManagement';
import ProductManagement from '../components/ProductManagement';
import BannerManagement from '../components/BannerManagement';
import OrderManagement from '../components/OrderManagement';
import { adminCategoriesAPI, adminProductsAPI, adminOrdersAPI, adminUsersAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [liveOrdersCount, setLiveOrdersCount] = useState(0);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchRiders = async () => {
    setRidersLoading(true);
    try {
      const res = await adminUsersAPI.getRiders();
      setRiders(res.data || []);
    } catch (err) {
      console.error('Error loading riders:', err);
    } finally {
      setRidersLoading(false);
    }
  };

  // Keep live clock updated and sync fleet
  useEffect(() => {
    fetchRiders();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    const fleetInterval = setInterval(fetchRiders, 12000);
    return () => {
      clearInterval(timer);
      clearInterval(fleetInterval);
    };
  }, []);

  const onlineRidersCount = riders.filter((r) => r.verificationStatus === 'verified' && r.isOnline).length;

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
            <span>Active Riders: <strong>{onlineRidersCount} Online</strong></span>
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
              <span className="sidebar-counter-badge green">{riders.length}</span>
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
              riders={riders}
            />
          )}
          {activeTab === 'orders' && <OrderManagement />}
          {activeTab === 'riders' && (
            <RiderFleetMonitor
              onSwitchTab={setActiveTab}
              riders={riders}
              loading={ridersLoading}
              onRefreshRiders={fetchRiders}
            />
          )}
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
const AdminDashboard = ({ onSwitchTab, onUpdateLiveCount, riders = [] }) => {
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
            <span className="kpi-main-number">{riders.length} Riders</span>
            <span className="kpi-trend positive">
              {riders.filter((r) => r.verificationStatus === 'verified' && r.isOnline).length} Online
            </span>
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
              {riders.length === 0 ? (
                <div className="rider-empty-mini">
                  No delivery partners created yet. Add one in Rider Fleet!
                </div>
              ) : (
                riders.slice(0, 5).map((r) => (
                  <div key={r._id} className="rider-mini-card">
                    <div className="rider-avatar-icon">🛵</div>
                    <div className="rider-mini-info">
                      <strong>{r.name}</strong>
                      <span>
                        {r.vehicleNumber || 'KYC Pending'} • {r.assignedHub?.split('•')[0]?.trim() || 'Hub'}
                      </span>
                    </div>
                    <div className="rider-mini-status">
                      <span
                        className={`rider-badge ${
                          r.verificationStatus !== 'verified'
                            ? 'busy'
                            : r.isOnline
                            ? 'available'
                            : 'busy'
                        }`}
                      >
                        {r.verificationStatus !== 'verified'
                          ? 'Pending KYC'
                          : r.isOnline
                          ? 'Online'
                          : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))
              )}
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
   RIDER FLEET MONITOR + CREATE RIDER (NAME, EMAIL, PHONE ONLY)
   ========================================================================= */
const RiderFleetMonitor = ({ onSwitchTab, riders = [], loading, onRefreshRiders }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdNotice, setCreatedNotice] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const handleCreateRider = async (e) => {
    e.preventDefault();
    setFormError('');
    setCreatedNotice(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setFormError('Name, Email, and Phone Number are all required.');
      return;
    }

    setCreating(true);
    try {
      const res = await adminUsersAPI.createRider({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });
      setCreatedNotice({
        email: res.data?.rider?.email || formData.email,
        temporaryPassword: res.data?.temporaryPassword || 'rider123',
        name: res.data?.rider?.name || formData.name,
      });
      setFormData({ name: '', email: '', phone: '' });
      setShowCreateForm(false);
      if (onRefreshRiders) onRefreshRiders();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Could not create rider.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRiderVerification = async (rider) => {
    const nextStatus = rider.verificationStatus === 'verified' ? 'suspended' : 'verified';
    setUpdatingStatusId(rider._id);
    try {
      await adminUsersAPI.updateRiderStatus(rider._id, nextStatus);
      if (onRefreshRiders) onRefreshRiders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update rider status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="fleet-monitor-container">
      <div className="workspace-header-bar">
        <div>
          <h1 className="workspace-title">Rider Fleet &amp; Partner Onboarding</h1>
          <p className="workspace-subtitle">
            Add riders with just Name, Email &amp; Phone — riders complete Vehicle &amp; KYC verification upon app login
          </p>
        </div>

        <div className="fleet-header-actions">
          <button
            type="button"
            className="add-rider-primary-btn"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setFormError('');
            }}
          >
            <UserPlus size={16} />
            <span>{showCreateForm ? 'Close Form' : 'Create Delivery Partner'}</span>
          </button>

          <button
            type="button"
            className="refresh-dashboard-btn"
            onClick={onRefreshRiders}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <Link to="/delivery" target="_blank" rel="noopener noreferrer" className="launch-rider-app-btn">
            <Truck size={16} />
            <span>Open Rider Portal</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {createdNotice && (
        <div className="rider-created-banner">
          <div>
            <strong>Delivery Partner Added: {createdNotice.name}</strong>
            <p>
              Login Email: <code>{createdNotice.email}</code> &bull; Initial Password:{' '}
              <code>{createdNotice.temporaryPassword}</code> &bull; Jab rider Delivery App login karega, waha wo apna Vehicle aur KYC verification process complete karega.
            </p>
          </div>
          <button type="button" onClick={() => setCreatedNotice(null)} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-rider-panel">
          <h3>Create New Delivery Partner (Quick Add)</h3>
          <p className="create-rider-sub">
            Sirf rider ka Naam, Email aur Phone Number daalein. Baaki vehicle, license aur KYC verification rider app me login karke khud complete karega.
          </p>

          {formError && <div className="admin-error-banner">{formError}</div>}

          <form onSubmit={handleCreateRider} className="create-rider-form-grid">
            <div className="rider-input-col">
              <label>Rider Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Suresh Kumar"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="rider-input-col">
              <label>Email Address *</label>
              <input
                type="email"
                placeholder="e.g. suresh.rider@progicart.com"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div className="rider-input-col">
              <label>Phone Number *</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                required
              />
            </div>

            <div className="rider-submit-col">
              <button type="submit" className="create-rider-submit-btn" disabled={creating}>
                {creating ? 'Creating...' : 'Create Rider Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {riders.length === 0 ? (
        <div className="orders-empty-state">
          <Truck size={42} className="empty-icon text-muted" />
          <h3>No Delivery Partners Registered Yet</h3>
          <p>Click "Create Delivery Partner" above or let riders self-register through the Progicart Rider APK.</p>
        </div>
      ) : (
        <div className="fleet-grid">
          {riders.map((rider) => {
            const isVerified = rider.verificationStatus === 'verified';
            const isSuspended = rider.verificationStatus === 'suspended';
            return (
              <div key={rider._id} className="fleet-rider-card">
                <div className="fleet-card-top">
                  <div className="rider-main-badge">
                    <div className="rider-pic">🛵</div>
                    <div>
                      <h3>{rider.name}</h3>
                      <span className="rider-phone">📞 {rider.phone}</span>
                      <span className="rider-email-small">✉️ {rider.email}</span>
                    </div>
                  </div>

                  <span
                    className={`status-pill ${
                      isVerified
                        ? rider.isOnline
                          ? 'ready'
                          : 'on-job'
                        : 'pending-pill'
                    }`}
                  >
                    {isSuspended
                      ? 'Suspended'
                      : !isVerified
                      ? 'Pending KYC'
                      : rider.isOnline
                      ? 'Verified • Online'
                      : 'Verified • Offline'}
                  </span>
                </div>

                <div className="fleet-card-details">
                  <div className="detail-row">
                    <span className="label">Vehicle:</span>
                    <span className="val bold">
                      {rider.vehicleNumber
                        ? `${rider.vehicleType ? rider.vehicleType.toUpperCase() + ' • ' : ''}${rider.vehicleNumber}`
                        : 'Pending Rider Setup'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Driving License / ID:</span>
                    <span className="val mono">
                      {rider.kycDetails?.drivingLicenseNumber || 'Not Submitted'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Zone / GPS:</span>
                    <span className="val">{rider.assignedHub || 'Vibhuti Khand Hub'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Orders (Active / Done):</span>
                    <span className="val text-green">
                      {rider.activeOrdersCount || 0} Active / {rider.completedOrdersCount || 0} Done
                    </span>
                  </div>
                </div>

                <div className="fleet-card-actions fleet-dual-actions">
                  <button
                    type="button"
                    className="btn-assign-order"
                    onClick={() => onSwitchTab('orders')}
                  >
                    Assign Order
                  </button>
                  <button
                    type="button"
                    className={`btn-verify-toggle ${isVerified ? 'suspend' : 'approve'}`}
                    disabled={updatingStatusId === rider._id}
                    onClick={() => handleToggleRiderVerification(rider)}
                  >
                    {updatingStatusId === rider._id
                      ? 'Saving...'
                      : isVerified
                      ? 'Suspend'
                      : 'Approve KYC'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Admin;
