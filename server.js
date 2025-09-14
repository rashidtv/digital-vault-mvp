require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ← ONLY ONE OF THESE!
const fs = require('fs');
const multer = require('multer'); // ← Add multer

// Initialize Express App
const app = express();

// Track startup time for debugging
const startTime = Date.now();
console.log('🚀 Starting server initialization...');

// Middleware
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'https://digital-vault-mvp.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage for now

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'), false);
    }
  }
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
let useRealMongoDB = false;

// Health check endpoint (CRITICAL for Render)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Serve static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// REAL upload endpoint with validation
app.post('/api/vault/upload', upload.single('document'), (req, res) => {
  try {
    console.log('Upload endpoint hit');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        message: 'No file uploaded. Please select a file.',
        status: 'error'
      });
    }

    console.log('File received:', {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Simulate processing (will replace with real processing later)
    res.json({ 
      message: 'File uploaded successfully! OCR processing started.',
      status: 'success',
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'Server error during upload',
      status: 'error'
    });
  }
});

// SIMPLE items endpoint for testing  
app.get('/api/vault/items', (req, res) => {
  console.log('Items endpoint hit');
  res.json([
    {
      id: 1,
      originalName: 'sample-document.pdf',
      fileSize: 1024,
      ocrStatus: 'completed',
      isProcessed: true,
      createdAt: new Date().toISOString(),
      extractedText: 'This is simulated OCR text for demonstration.'
    }
  ]);
});

// SIMPLE auth endpoints for testing
app.post('/api/auth/login', (req, res) => {
  res.json({
    token: 'simulated-jwt-token-for-testing',
    user: { id: 1, username: 'testuser', email: 'test@example.com', isSubscribed: true }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    token: 'simulated-jwt-token-for-testing',
    user: { id: 1, username: 'testuser', email: 'test@example.com', isSubscribed: true }
  });
});

app.get('/api/auth/user', (req, res) => {
  res.json({ id: 1, username: 'testuser', email: 'test@example.com', isSubscribed: true });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
});

// Basic error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;