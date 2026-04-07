import React, { useEffect, useState } from 'react';
import { adminCategoriesAPI } from '../api/api';
import '../styles/Management.css';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    image: '',
    description: '',
    displayOrder: 0,
    showOnHome: false,
    homeTitle: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [subcategoryData, setSubcategoryData] = useState({
    name: '',
    icon: '',
    image: '',
    displayOrder: 0,
  });
  const [editingSubcategoryId, setEditingSubcategoryId] = useState(null);
  const [subcategoryImageFile, setSubcategoryImageFile] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await adminCategoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      alert('Error fetching categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('icon', formData.icon || '');
      payload.append('description', formData.description || '');
      payload.append('displayOrder', String(formData.displayOrder || 0));
      payload.append('image', formData.image || '');
      payload.append('showOnHome', String(Boolean(formData.showOnHome)));
      payload.append('homeTitle', formData.homeTitle || '');
      if (imageFile) {
        payload.append('imageFile', imageFile);
      }

      if (editingId) {
        await adminCategoriesAPI.update(editingId, payload);
        alert('Category updated successfully!');
      } else {
        await adminCategoriesAPI.create(payload);
        alert('Category created successfully!');
      }
      setFormData({ name: '', icon: '', image: '', description: '', displayOrder: 0, showOnHome: false, homeTitle: '' });
      setImageFile(null);
      setEditingId(null);
      setShowForm(false);
      fetchCategories();
    } catch (error) {
      alert('Error: ' + error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name || '',
      icon: category.icon || '',
      image: category.image || '',
      description: category.description || '',
      displayOrder: category.displayOrder || 0,
      showOnHome: Boolean(category.showOnHome),
      homeTitle: category.homeTitle || '',
    });
    setImageFile(null);
    setEditingId(category._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await adminCategoriesAPI.delete(id);
        alert('Category deleted successfully!');
        fetchCategories();
      } catch (error) {
        alert('Error: ' + error.response?.data?.message || error.message);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: '', icon: '', image: '', description: '', displayOrder: 0 });
    setImageFile(null);
    setEditingId(null);
  };

  const toggleExpandCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setShowSubcategoryForm(false);
  };

  const handleAddSubcategory = async () => {
    if (!subcategoryData.name.trim()) {
      alert('Subcategory name is required');
      return;
    }

    const category = categories.find(c => c._id === expandedCategory);
    if (!category) return;

    try {
      const updatedSubcategories = [...(category.subcategories || [])];
      
      if (editingSubcategoryId) {
        const index = updatedSubcategories.findIndex(s => s._id === editingSubcategoryId);
        if (index !== -1) {
          updatedSubcategories[index] = {
            ...updatedSubcategories[index],
            ...subcategoryData,
            // Keep old image if no new file is provided
            image: updatedSubcategories[index].image,
            imagePublicId: updatedSubcategories[index].imagePublicId,
          };
        }
      } else {
        updatedSubcategories.push({
          ...subcategoryData,
          image: '',
          imagePublicId: '',
        });
      }

      // Build FormData with category info
      const formDataToSend = new FormData();
      formDataToSend.append('name', category.name);
      formDataToSend.append('icon', category.icon || '');
      formDataToSend.append('image', category.image || '');
      formDataToSend.append('description', category.description || '');
      formDataToSend.append('displayOrder', String(category.displayOrder || 0));
      formDataToSend.append('showOnHome', String(Boolean(category.showOnHome)));
      formDataToSend.append('homeTitle', category.homeTitle || '');
      
      // Get the index of the subcategory in the updated list
      const subcategoryIndex = editingSubcategoryId 
        ? updatedSubcategories.findIndex(s => s._id === editingSubcategoryId)
        : updatedSubcategories.length - 1;

      // Append subcategory image file if provided
      if (subcategoryImageFile && subcategoryIndex >= 0) {
        formDataToSend.append(`subcategoryImage_${subcategoryIndex}`, subcategoryImageFile);
      }

      formDataToSend.append('subcategories', JSON.stringify(updatedSubcategories));

      await adminCategoriesAPI.update(expandedCategory, formDataToSend);
      alert(editingSubcategoryId ? 'Subcategory updated!' : 'Subcategory added!');
      setSubcategoryData({ name: '', icon: '', image: '', displayOrder: 0 });
      setSubcategoryImageFile(null);
      setEditingSubcategoryId(null);
      setShowSubcategoryForm(false);
      fetchCategories();
    } catch (error) {
      alert('Error: ' + error.response?.data?.message || error.message);
    }
  };

  const handleEditSubcategory = (subcategory) => {
    setSubcategoryData({
      name: subcategory.name || '',
      icon: subcategory.icon || '',
      image: subcategory.image || '',
      displayOrder: subcategory.displayOrder || 0,
    });
    setSubcategoryImageFile(null);
    setEditingSubcategoryId(subcategory._id);
    setShowSubcategoryForm(true);
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (!window.confirm('Delete this subcategory?')) return;

    const category = categories.find(c => c._id === expandedCategory);
    if (!category) return;

    try {
      const updatedSubcategories = category.subcategories.filter(s => s._id !== subcategoryId);

      const formDataToSend = new FormData();
      formDataToSend.append('name', category.name);
      formDataToSend.append('icon', category.icon || '');
      formDataToSend.append('image', category.image || '');
      formDataToSend.append('description', category.description || '');
      formDataToSend.append('displayOrder', String(category.displayOrder || 0));
      formDataToSend.append('showOnHome', String(Boolean(category.showOnHome)));
      formDataToSend.append('homeTitle', category.homeTitle || '');
      formDataToSend.append('subcategories', JSON.stringify(updatedSubcategories));

      await adminCategoriesAPI.update(expandedCategory, formDataToSend);
      alert('Subcategory deleted!');
      fetchCategories();
    } catch (error) {
      alert('Error: ' + error.response?.data?.message || error.message);
    }
  };

  const handleCancelSubcategory = () => {
    setShowSubcategoryForm(false);
    setSubcategoryData({ name: '', icon: '', image: '', displayOrder: 0 });
    setSubcategoryImageFile(null);
    setEditingSubcategoryId(null);
  };

  return (
    <div className="management">
      <div className="management-header">
        <h2>Category Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {showForm && (
        <form className="form-container" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Category Name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="icon"
            placeholder="Icon (emoji or text)"
            value={formData.icon}
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
          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
          />
          <input
            type="text"
            name="homeTitle"
            placeholder="Home Section Title (optional)"
            value={formData.homeTitle}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="displayOrder"
            placeholder="Display Order"
            value={formData.displayOrder}
            onChange={handleInputChange}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="showOnHome"
              checked={formData.showOnHome}
              onChange={handleInputChange}
            />
            Show this category on Home
          </label>
          <div className="form-buttons">
            <button type="submit" className="btn-success">
              {editingId ? 'Update' : 'Create'} Category
            </button>
            <button type="button" className="btn-cancel" onClick={handleCancel}>
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
                <th>Icon</th>
                <th>Image</th>
                <th>Description</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <React.Fragment key={cat._id}>
                  <tr>
                    <td>{cat.name}</td>
                    <td>{cat.icon}</td>
                    <td>{cat.image ? '✓' : '✗'}</td>
                    <td>{cat.description?.substring(0, 30)}...</td>
                    <td>{cat.displayOrder}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-expand"
                        onClick={() => toggleExpandCategory(cat._id)}
                      >
                        {expandedCategory === cat._id ? '▼' : '▶'} Subcategories ({cat.subcategories?.length || 0})
                      </button>
                      <button type="button" className="btn-edit" onClick={() => handleEdit(cat)}>
                        Edit
                      </button>
                      <button type="button" className="btn-delete" onClick={() => handleDelete(cat._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expandedCategory === cat._id && (
                    <tr className="subcategories-row">
                      <td colSpan="6">
                        <div className="subcategories-section">
                          <div className="subcategories-header">
                            <h4>Subcategories</h4>
                            {!showSubcategoryForm && (
                              <button
                                className="btn-primary-small"
                                onClick={() => setShowSubcategoryForm(true)}
                              >
                                + Add Subcategory
                              </button>
                            )}
                          </div>

                          {showSubcategoryForm && (
                            <form className="subcategory-form" onSubmit={(e) => {
                              e.preventDefault();
                              handleAddSubcategory();
                            }}>
                              <input
                                type="text"
                                placeholder="Subcategory Name"
                                value={subcategoryData.name}
                                onChange={(e) => setSubcategoryData({ ...subcategoryData, name: e.target.value })}
                                required
                              />
                              <input
                                type="text"
                                placeholder="Icon (emoji)"
                                value={subcategoryData.icon}
                                onChange={(e) => setSubcategoryData({ ...subcategoryData, icon: e.target.value })}
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSubcategoryImageFile(e.target.files?.[0] || null)}
                                title="Upload subcategory image (will be saved to Cloudinary)"
                              />
                              <input
                                type="number"
                                placeholder="Display Order"
                                value={subcategoryData.displayOrder}
                                onChange={(e) => setSubcategoryData({ ...subcategoryData, displayOrder: Number(e.target.value) })}
                              />
                              {subcategoryData.image && !subcategoryImageFile && (
                                <div className="current-image-preview">
                                  <img src={subcategoryData.image} alt={subcategoryData.name} />
                                  <small>Current Image</small>
                                </div>
                              )}
                              {subcategoryImageFile && (
                                <div className="new-image-preview">
                                  <img src={URL.createObjectURL(subcategoryImageFile)} alt="Preview" />
                                  <small>New Image</small>
                                </div>
                              )}
                              <div className="form-buttons">
                                <button type="submit" className="btn-success">
                                  {editingSubcategoryId ? 'Update' : 'Add'} Subcategory
                                </button>
                                <button type="button" className="btn-cancel" onClick={handleCancelSubcategory}>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          )}

                          {cat.subcategories && cat.subcategories.length > 0 ? (
                            <div className="subcategories-list">
                              {cat.subcategories.map((subcat) => (
                                <div key={subcat._id} className="subcategory-item">
                                  <div className="subcategory-info">
                                    {subcat.image ? (
                                      <img src={subcat.image} alt={subcat.name} className="subcat-image" />
                                    ) : (
                                      <span className="subcat-icon">{subcat.icon || '📦'}</span>
                                    )}
                                    <span className="subcat-name">{subcat.name}</span>
                                    <span className="subcat-order">Order: {subcat.displayOrder}</span>
                                  </div>
                                  <div className="subcategory-actions">
                                    <button
                                      type="button"
                                      className="btn-small-edit"
                                      onClick={() => handleEditSubcategory(subcat)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-small-delete"
                                      onClick={() => handleDeleteSubcategory(subcat._id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-subcategories">No subcategories yet</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;