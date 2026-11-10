import React, { useState, useEffect } from 'react';
import { bannersAPI, adminBannersAPI, categoriesAPI } from '../api/api';
import '../styles/Management.css';

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    cta: 'Shop Now',
    link: '/products',
    bg: '#f4fae7',
    textColor: '#333333',
    type: 'hero',
    isActive: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [categories, setCategories] = useState([]);

  const resolveBannerImage = (img) => {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return img.startsWith('/') ? img : `/${img}`;
  };

  useEffect(() => {
    fetchBanners();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories', error);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await adminBannersAPI.getAll ? await adminBannersAPI.getAll() : await bannersAPI.getAll();
      setBanners(res.data);
    } catch (error) {
      console.error('Error fetching banners', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (banner) => {
    setEditingId(banner._id);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      cta: banner.cta || 'Shop Now',
      link: banner.link || '/products',
      bg: banner.bg || '#f4fae7',
      textColor: banner.textColor || '#333333',
      type: banner.type || 'promo',
      isActive: banner.isActive ?? true,
    });
    setImagePreview(resolveBannerImage(banner.image));
    setImageFile(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      subtitle: '',
      cta: 'Shop Now',
      link: '/products',
      bg: '#f4fae7',
      textColor: '#333333',
      type: 'hero',
      isActive: true,
    });
    setImagePreview('');
    setImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      if (editingId) {
        await adminBannersAPI.update(editingId, data);
        alert('Banner updated!');
      } else {
        await adminBannersAPI.create(data);
        alert('Banner created!');
      }
      fetchBanners();
      handleCancel();
    } catch (error) {
      console.error('Error saving banner', error);
      alert('Failed to save banner: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await adminBannersAPI.delete(id);
        fetchBanners();
      } catch (error) {
        console.error('Error deleting banner', error);
      }
    }
  };

  return (
    <div className="management">
      <div className="management-header">
        <h2>Banner Management</h2>
        <button className="btn-primary" onClick={() => { handleCancel(); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : '+ Add Banner'}
        </button>
      </div>

      {showForm && (
        <form className="form-container" onSubmit={handleSubmit}>
          <select name="type" value={formData.type} onChange={handleInputChange}>
            <option value="promo">Promo Sub-Banner</option>
            <option value="hero">Hero Banner (Top)</option>
          </select>
          <textarea name="title" value={formData.title} onChange={handleInputChange} placeholder="Title (can use multiple lines)" rows="2" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }} required />
          <textarea name="subtitle" value={formData.subtitle} onChange={handleInputChange} placeholder="Subtitle (can use multiple lines)" rows="3" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }} />
          <input type="text" name="cta" value={formData.cta} onChange={handleInputChange} placeholder="CTA Text" />
          <select 
            onChange={(e) => {
              if (e.target.value) {
                setFormData(prev => ({ ...prev, link: `/products?category=${e.target.value}` }));
              }
            }}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'inherit' }}
          >
            <option value="">-- Connect to a Category (Optional) --</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <input type="text" name="link" value={formData.link} onChange={handleInputChange} placeholder="Link / URL (Auto-fills if you select a category above)" />
          <input type="text" name="bg" value={formData.bg} onChange={handleInputChange} placeholder="Background Color (Hex/Name)" />
          <input type="text" name="textColor" value={formData.textColor} onChange={handleInputChange} placeholder="Text Color (Hex)" />
          
          <label className="checkbox-label">
            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} /> Active
          </label>
          
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && (
             <div style={{marginTop: '10px'}}>
               <img src={imagePreview} alt="Preview" style={{maxHeight: '100px', borderRadius: '4px'}} />
             </div>
          )}

          <div className="form-buttons">
            <button type="submit" className="btn-success">{editingId ? 'Update' : 'Create'} Banner</button>
            <button type="button" className="btn-cancel" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-container">
          <table className="management-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b._id}>
                  <td>
                    {b.image ? (
                      <img src={resolveBannerImage(b.image)} alt={b.title} width="60" style={{borderRadius: '4px'}} />
                    ) : (
                      <div style={{width: 60, height: 40, background: b.bg, borderRadius: '4px'}}></div>
                    )}
                  </td>
                  <td>{b.type.toUpperCase()}</td>
                  <td>{b.title}</td>
                  <td>{b.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(b)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(b._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
