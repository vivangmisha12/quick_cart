const Category = require('../models/Category');
const mongoose = require('mongoose');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs/promises');

const uploadToCloudinary = async (file, folder = 'quick-cart/categories') => {
  if (!file) return { url: '', publicId: '' };
  try {
    const res = await cloudinary.uploader.upload(file.path, { folder });
    return { url: res.secure_url, publicId: res.public_id };
  } catch (err) {
    console.error('Cloudinary upload failed:', err.message);
    return { url: '', publicId: '' };
  } finally {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
};

const extractSingleFile = (req, field = 'imageFile') => {
  if (req.file) return req.file;
  // Handle multer.any() format where files is an array with fieldname property
  if (Array.isArray(req.files)) {
    const file = req.files.find(f => f.fieldname === field);
    return file || null;
  }
  // Handle traditional multer.fields() format where files is an object
  const arr = req.files?.[field];
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
};

const extractFileByFieldname = (req, fieldname) => {
  // For multer.any() format
  if (Array.isArray(req.files)) {
    return req.files.find(f => f.fieldname === fieldname) || null;
  }
  // For traditional format
  const arr = req.files?.[fieldname];
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
};

const normalizeSubcategoryId = (id) => {
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return new mongoose.Types.ObjectId();
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create category (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, icon, image, description, displayOrder, showOnHome, homeTitle, subcategories } = req.body;
    const singleFile = extractSingleFile(req, 'imageFile');
    
    // Extract multiFiles - handle both multer.any() and multer.fields() formats
    let multiFiles = [];
    if (Array.isArray(req.files)) {
      multiFiles = req.files.filter(f => f.fieldname === 'imageFiles');
    } else {
      multiFiles = req.files?.imageFiles || [];
    }

    const { url, publicId } = await uploadToCloudinary(singleFile);
    const uploadedExtras = await Promise.all(multiFiles.map((f) => uploadToCloudinary(f)));
    const extraUrls = uploadedExtras.map((u) => u.url).filter(Boolean);
    const extraPublicIds = uploadedExtras.map((u) => u.publicId).filter(Boolean);
    
    // Parse and process subcategories
    let parsedSubcategories = [];
    if (subcategories) {
      parsedSubcategories = typeof subcategories === 'string' 
        ? JSON.parse(subcategories) 
        : subcategories;
      
      // Handle subcategory image uploads
      parsedSubcategories = await Promise.all(parsedSubcategories.map(async (sub, index) => {
        let subImage = { url: '', publicId: '' };
        const subImageFile = extractFileByFieldname(req, `subcategoryImage_${index}`);
        if (subImageFile) {
          subImage = await uploadToCloudinary(subImageFile, 'quick-cart/subcategories');
        }
        
        return {
          _id: normalizeSubcategoryId(sub._id),
          name: sub.name,
          icon: sub.icon || '📦',
          image: subImage.url || sub.image || '',
          imagePublicId: subImage.publicId || sub.imagePublicId || '',
          displayOrder: sub.displayOrder || 0,
        };
      }));
    }

    const category = new Category({
      name,
      icon,
      image: url || image,
      imagePublicId: publicId || undefined,
      images: extraUrls,
      imagePublicIds: extraPublicIds,
      description,
      displayOrder,
      showOnHome,
      homeTitle,
      subcategories: parsedSubcategories,
    });
    await category.save();
    res.status(201).json({ message: 'Category created', category });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update category (admin only)
exports.updateCategory = async (req, res) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const payload = { ...req.body };
    const singleFile = extractSingleFile(req, 'imageFile');
    
    // Extract multiFiles - handle both multer.any() and multer.fields() formats
    let multiFiles = [];
    if (Array.isArray(req.files)) {
      multiFiles = req.files.filter(f => f.fieldname === 'imageFiles');
    } else {
      multiFiles = req.files?.imageFiles || [];
    }

    const { url, publicId } = await uploadToCloudinary(singleFile);
    if (url) {
      await deleteFromCloudinary(existing.imagePublicId);
      payload.image = url;
      payload.imagePublicId = publicId;
    }

    if (multiFiles.length) {
      if (existing.imagePublicIds?.length) {
        await Promise.all(existing.imagePublicIds.map(deleteFromCloudinary));
      }
      const uploadedExtras = await Promise.all(multiFiles.map((f) => uploadToCloudinary(f)));
      payload.images = uploadedExtras.map((u) => u.url).filter(Boolean);
      payload.imagePublicIds = uploadedExtras.map((u) => u.publicId).filter(Boolean);
    }

    // Handle subcategories update
    if (payload.subcategories) {
      const parsedSubcategories = typeof payload.subcategories === 'string' 
        ? JSON.parse(payload.subcategories) 
        : payload.subcategories;
      
      // Handle subcategory image uploads - preserve old images if no new file provided
      payload.subcategories = await Promise.all(parsedSubcategories.map(async (sub, index) => {
        let finalImage = sub.image || '';
        let finalImagePublicId = sub.imagePublicId || '';
        
        const subImageFile = extractFileByFieldname(req, `subcategoryImage_${index}`);
        if (subImageFile) {
          // Delete old image if exists
          if (sub.imagePublicId) {
            await deleteFromCloudinary(sub.imagePublicId).catch(() => {});
          }
          // Upload new image
          const subImage = await uploadToCloudinary(subImageFile, 'quick-cart/subcategories');
          finalImage = subImage.url || '';
          finalImagePublicId = subImage.publicId || '';
        }
        
        return {
          _id: normalizeSubcategoryId(sub._id),
          name: sub.name,
          icon: sub.icon || '📦',
          image: finalImage,
          imagePublicId: finalImagePublicId,
          displayOrder: sub.displayOrder || 0,
        };
      }));
    }

    const category = await Category.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json({ message: 'Category updated', category });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete category (admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await Category.findByIdAndDelete(req.params.id);
    await deleteFromCloudinary(category.imagePublicId);
    if (category.imagePublicIds?.length) {
      await Promise.all(category.imagePublicIds.map(deleteFromCloudinary));
    }
    // Delete subcategory images from Cloudinary
    if (category.subcategories?.length > 0) {
      await Promise.all(
        category.subcategories
          .filter(sub => sub.imagePublicId)
          .map(sub => deleteFromCloudinary(sub.imagePublicId))
      );
    }
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};