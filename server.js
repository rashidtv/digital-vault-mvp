require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// =======================
// Middleware
// =======================
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

// =======================
// In-memory "DB"
// =======================
let users = [];        // { id, email, password, name, isSubscribed, pdpaConsent }
let vaultItems = [];   // { id, userId, originalName, fileSize, fileType, createdAt }

// =======================
// Auth Middleware
// =======================
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// =======================
// File Upload (Multer)
// =======================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// =======================
// Health Check
// =======================
app.get('/health', (req, res) => res.json({ status: "OK" }));

// =======================
// Static Pages
// =======================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// =======================
// Auth Routes
// =======================
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser = {
    id: Date.now().toString(),
    email,
    password,  // ⚠️ Plain text for MVP
    name,
    isSubscribed: true,
    pdpaConsent: false
  };

  users.push(newUser);

  const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user });
});

app.get('/api/auth/user', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.post("/api/auth/consent", authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.pdpaConsent = true;
  user.pdpaConsentDate = new Date().toISOString();

  res.json({ ok: true, message: "Consent recorded" });
});

// =======================
// Vault Routes
// =======================
app.post('/api/vault/upload', authMiddleware, upload.single('document'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const newItem = {
    id: Date.now().toString(),
    userId: req.user.id,  // ✅ link file to logged-in user
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

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
