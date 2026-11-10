const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file hosting for uploads and category images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/category-images', express.static(path.join(__dirname, '../../frontend/public/category-images')));

// Cached MongoDB Connection for Serverless & Long-running instances
let cachedConnection = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not set in environment variables');
    return null;
  }
  if (!cachedConnection) {
    cachedConnection = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    }).then((conn) => {
      console.log('MongoDB connected successfully');
      return conn;
    }).catch((err) => {
      cachedConnection = null;
      console.error('MongoDB connection error:', err.message);
      throw err;
    });
  }
  return cachedConnection;
};

// Database connection middleware
app.use(async (req, res, next) => {
  try {
    if (process.env.MONGODB_URI && mongoose.connection.readyState < 1) {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('Database connection failed on request:', err.message);
    res.status(503).json({
      message: 'Database connection failed. Please ensure MONGODB_URI is valid in environment variables.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Progicart Backend API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting/disconnected',
    timestamp: new Date().toISOString()
  });
});

// Base API route
app.get(['/api', '/'], (req, res) => {
  res.json({
    message: '⚡ Welcome to Progicart API',
    version: '1.0.0',
    documentation: 'Everything delivered in 10 minutes'
  });
});

// Register routes (both with and without /api prefix for maximum Vercel rewrite compatibility)
const registerRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, require('./routes/auth'));
  app.use(`${prefix}/products`, require('./routes/products'));
  app.use(`${prefix}/cart`, require('./routes/cart'));
  app.use(`${prefix}/orders`, require('./routes/orders'));
  app.use(`${prefix}/categories`, require('./routes/categories'));
  app.use(`${prefix}/users`, require('./routes/users'));
  app.use(`${prefix}/banners`, require('./routes/banners'));
  app.use(`${prefix}/location`, require('./routes/location'));
};

registerRoutes('/api');
registerRoutes('');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

module.exports = { app, connectDB };

