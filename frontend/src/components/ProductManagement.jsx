import React, { useEffect, useRef, useState } from 'react';
import { adminProductsAPI, adminCategoriesAPI } from '../api/api';
import '../styles/Management.css';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    categoryId: '',
    subcategoryId: '',
    image: '',
    stock: '',
    unit: '',
    discount: '',
    deliveryTime: '',
    isTrending: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await adminProductsAPI.getAll();
      setProducts(res.data);
    } catch (error) {
      alert('Error fetching products: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await adminCategoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData({
      ...formData,
      [name]: nextValue,
      // Reset subcategory when category changes so mismatch cannot happen.
      ...(name === 'categoryId' ? { subcategoryId: '' } : {}),
    });
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files?.[0] || null);
  };

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description || '');
      payload.append('price', String(formData.price || ''));
      payload.append('originalPrice', String(formData.originalPrice || ''));
      payload.append('categoryId', formData.categoryId || '');
      payload.append('subcategoryId', formData.subcategoryId || '');
      payload.append('image', formData.image || '');
      payload.append('stock', String(formData.stock || 0));
      payload.append('unit', formData.unit || 'piece');
      payload.append('discount', String(formData.discount || 0));
      payload.append('deliveryTime', String(formData.deliveryTime || 17));
      payload.append('isTrending', String(Boolean(formData.isTrending)));
      if (imageFile) {
        payload.append('imageFile', imageFile);
      }
      if (!formData.image && !imageFile) {
        alert('Please provide an image URL or upload an image file.');
        return;
      }
      if (!formData.description) {
        alert('Description is required.');
        return;
      }

      if (editingId) {
        await adminProductsAPI.update(editingId, payload);
        alert('Product updated successfully!');
      } else {
        await adminProductsAPI.create(payload);
        alert('Product created successfully!');
      }
      resetForm();
      fetchProducts();
    } catch (error) {
      alert('Error: ' + error.response?.data?.message || error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      categoryId: '',
      subcategoryId: '',
      image: '',
      stock: '',
      unit: '',
      discount: '',
      deliveryTime: '',
      isTrending: false,
    });
    setImageFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setFormData({ 
      ...product, 
      categoryId: product.categoryId?._id || product.categoryId,
      subcategoryId: product.subcategoryId || '' 
    });
    setImageFile(null);
    setEditingId(product._id);
    setShowForm(true);
    scrollToForm();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await adminProductsAPI.delete(id);
        alert('Product deleted successfully!');
        fetchProducts();
      } catch (error) {
        alert('Error: ' + error.response?.data?.message || error.message);
      }
    }
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'N/A';
    const cat = categories.find((c) => 
      c._id === (typeof categoryId === 'object' ? categoryId._id : categoryId)
    );
    return cat?.name || 'Unknown';
  };

  const getSubcategoryName = (categoryId, subcategoryId) => {
    if (!categoryId || !subcategoryId) return 'N/A';
    const category = categories.find((c) =>
      c._id === (typeof categoryId === 'object' ? categoryId._id : categoryId)
    );
    const sub = category?.subcategories?.find((s) => String(s._id) === String(subcategoryId));
    return sub?.name || 'Unknown';
  };

  const selectedCategory = categories.find((c) => c._id === formData.categoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];

  return (
    <div className="management">
      <div className="management-header">
        <h2>Product Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form className="form-container" onSubmit={handleSubmit} ref={formRef}>
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            required
          />
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            name="subcategoryId"
            value={formData.subcategoryId}
            onChange={handleInputChange}
            disabled={!formData.categoryId || availableSubcategories.length === 0}
          >
            <option value="">
              {!formData.categoryId
                ? 'Select Category First'
                : availableSubcategories.length === 0
                ? 'No Subcategories Available'
                : 'Select Subcategory'}
            </option>
            {availableSubcategories.map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleInputChange}
            step="0.01"
            required
          />
          <input
            type="number"
            name="originalPrice"
            placeholder="Original Price"
            value={formData.originalPrice}
            onChange={handleInputChange}
            step="0.01"
          />
          <input
            type="number"
            name="discount"
            placeholder="Discount %"
            value={formData.discount}
            onChange={handleInputChange}
          />
          <input
            type="text"
            name="image"
            placeholder="Image URL"
            value={formData.image}
            onChange={handleInputChange}
          />
          <input
            type="file"
            name="imageFile"
            accept="image/*"
            onChange={handleFileChange}
          />
          <input
            type="number"
            name="deliveryTime"
            placeholder="Delivery Time (mins)"
            value={formData.deliveryTime}
            onChange={handleInputChange}
            min="1"
          />
          <input
            type="number"
            name="stock"
            placeholder="Stock Quantity"
            value={formData.stock}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="unit"
            placeholder="Unit (e.g., kg, l, pieces)"
            value={formData.unit}
            onChange={handleInputChange}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isTrending"
              checked={formData.isTrending}
              onChange={handleInputChange}
            />
            Mark as Trending
          </label>
          <div className="form-buttons">
            <button type="submit" className="btn-success">
              {editingId ? 'Update' : 'Create'} Product
            </button>
            <button type="button" className="btn-cancel" onClick={resetForm}>
              Cancel
            </button>
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
                <th>Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Image</th>
                <th>Trending</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => (
                <tr key={prod._id}>
                  <td>{prod.name}</td>
                  <td>{getCategoryName(prod.categoryId)}</td>
                  <td>{getSubcategoryName(prod.categoryId, prod.subcategoryId)}</td>
                  <td>₹{prod.price}</td>
                  <td>{prod.stock}</td>
                  <td>{prod.image ? '✓' : '✗'}</td>
                  <td>{prod.isTrending ? '⭐' : ''}</td>
                  <td>
                    <button type="button" className="btn-edit" onClick={() => handleEdit(prod)}>
                      Edit
                    </button>
                    <button type="button" className="btn-delete" onClick={() => handleDelete(prod._id)}>
                      Delete
                    </button>
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

export default ProductManagement;