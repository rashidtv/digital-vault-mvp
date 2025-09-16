require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// In-memory items store
let vaultItems = [];

// Upload endpoint
app.post('/api/vault/upload', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  }

  const newItem = {
    id: Date.now(),
    originalName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    createdAt: new Date().toISOString(),
    ocrStatus: 'completed',
    isProcessed: true,
    extractedText: 'Simulated OCR text...',
    nomineeName: req.body.nomineeName,
    nomineeEmail: req.body.nomineeEmail,
    nomineePhone: req.body.nomineePhone,
    trusteeName: req.body.trusteeName,
    trusteeEmail: req.body.trusteeEmail,
    trusteePhone: req.body.trusteePhone
  };

  vaultItems.push(newItem);

  res.json({ status: 'success', message: 'File uploaded successfully', item: newItem });
});

// Items endpoint
app.get('/api/vault/items', (req, res) => {
  res.json(vaultItems);
});

// Auth (mock)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'mock-token', user: { id: 1, username: 'testuser' } });
});
app.post('/api/auth/register', (req, res) => {
  res.json({ token: 'mock-token', user: { id: 1, username: 'testuser' } });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
