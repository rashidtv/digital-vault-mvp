require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

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
      return callback(new Error("CORS not allowed"), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Simulated in-memory DB
let users = [
  { id: "1", email: "admin@admin.com", password: "test123", name: "Admin", isSubscribed: true, pdpaConsent: false }
];
let vaultItems = [];

// File upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Health check
app.get('/health', (req, res) => res.json({ status: "OK" }));

// Serve static
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // store user info in request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}


// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "Email already exists" });

  const newUser = { id: Date.now().toString(), email, password, name, isSubscribed: true, pdpaConsent: false };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: newUser });
});

app.get('/api/auth/user', (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// PDPA consent route
app.post("/api/auth/consent", (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.pdpaConsent = true;
    user.pdpaConsentDate = new Date().toISOString();

    res.json({ ok: true, message: "Consent recorded" });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Vault endpoints
app.post('/api/vault/upload', authMiddleware, upload.single('document'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const newItem = {
    id: Date.now().toString(),
    userId: req.user.id,   // ✅ link file to user
    originalName: req.file.originalname,
    fileSize: req.file.size,
    fileType: req.file.mimetype,
    ocrStatus: "pending",
    isProcessed: false,
    createdAt: new Date().toISOString()
  };
  vaultItems.push(newItem);

  res.json({ status: "success", message: "File uploaded successfully", file: newItem });
});


app.get('/api/vault/items', authMiddleware, (req, res) => {
  const userItems = vaultItems.filter(item => item.userId === req.user.id);
  res.json(userItems);
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
