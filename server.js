require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'https://digital-vault-mvp.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy does not allow this origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- File Upload (multer) ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) cb(null, true);
    else cb(new Error('Only images and PDF files are allowed'));
  }
});

// --- In-memory Vault Store ---
let vaultItems = [];

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// --- Auth (Simulated) ---
app.post('/api/auth/login', (req, res) => {
  res.json({
    token: 'simulated-jwt-token',
    user: { id: 1, username: 'testuser', email: 'test@example.com', isSubscribed: true }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    token: 'simulated-jwt-token',
    user: { id: 1, username: 'testuser', email: 'test@example.com', isSubscribed: true }
  });
});

app.get('/api/auth/user', (req, res) => {
  res.json({ id: 1, username: 'testuser', email: 'test@example.com', isSubscribed: true });
});

// --- Vault Upload ---
app.post('/api/vault/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { nomineeName, nomineeRel } = req.body;

    const newItem = {
      id: Date.now(),
      originalName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      ocrStatus: 'processing',
      isProcessed: false,
      createdAt: new Date(),
      extractedText: null,
      nominee: {
        name: nomineeName || '',
        relationship: nomineeRel || ''
      }
    };

    vaultItems.push(newItem);

    res.json({
      status: 'success',
      message: 'File uploaded successfully! OCR processing started.',
      item: newItem
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ status: 'error', message: 'Server error during upload' });
  }
});

// --- Vault Items ---
app.get('/api/vault/items', (req, res) => {
  res.json(vaultItems);
});

// --- Serve Pages ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
});

// --- Error Handling ---
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, 'reason:', reason);
});

module.exports = app;
