import React, { useEffect, useState } from 'react';
import CategoryManagement from '../components/CategoryManagement';
import ProductManagement from '../components/ProductManagement';
import { adminCategoriesAPI, adminProductsAPI, adminOrdersAPI, adminUsersAPI } from '../api/api';
import '../styles/Admin.css';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <h2>Admin Panel</h2>
        <nav className="admin-nav">
          <button
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            📂 Categories
          </button>
          <button
            className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Products
          </button>
        </nav>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'categories' && <CategoryManagement />}
        {activeTab === 'products' && <ProductManagement />}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ categories: null, products: null, orders: null, users: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const [catRes, prodRes, orderRes, userRes] = await Promise.all([
          adminCategoriesAPI.getAll(),
          adminProductsAPI.getAll(),
          adminOrdersAPI.getAll(),
          adminUsersAPI.getCount(),
        ]);

        setStats({
          categories: catRes.data?.length ?? 0,
          products: prodRes.data?.length ?? 0,
          orders: orderRes.data?.length ?? 0,
          users: userRes.data?.count ?? 0,
        });
      } catch (err) {
        console.error('Error loading admin stats', err);
        setError('Unable to load totals');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-cards">
        <div className="card">
          <h3>Total Categories</h3>
          <p className="card-value">{loading ? '...' : stats.categories ?? '--'}</p>
        </div>
        <div className="card">
          <h3>Total Products</h3>
          <p className="card-value">{loading ? '...' : stats.products ?? '--'}</p>
        </div>
        <div className="card">
          <h3>Total Orders</h3>
          <p className="card-value">{loading ? '...' : stats.orders ?? '--'}</p>
        </div>
        <div className="card">
          <h3>Total Users</h3>
          <p className="card-value">{loading ? '...' : stats.users ?? '--'}</p>
        </div>
      </div>
      {error && <p style={{ color: '#c53030', marginTop: '10px' }}>{error}</p>}
      <p style={{ marginTop: '20px', color: '#666' }}>
        Use the left menu to manage categories and products.
      </p>
    </div>
  );
};

export default Admin;