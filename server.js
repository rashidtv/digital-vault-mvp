require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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
    // Allow requests with no origin (like mobile apps, Postman)
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

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
let useRealMongoDB = false;

// Debug MongoDB connection
console.log('📦 MongoDB URI provided:', MONGODB_URI ? 'Yes' : 'No');
if (MONGODB_URI) {
  console.log('🔗 URI starts with:', MONGODB_URI.substring(0, 25) + '...');
}

// Health check endpoints - MUST COME FIRST for Render monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    startupTime: Date.now() - startTime + 'ms',
    database: useRealMongoDB ? 'Connected' : 'Disconnected/Temporary'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'API is healthy',
    database: useRealMongoDB ? 'Connected' : 'Disconnected/Temporary'
  });
});

// Immediate response endpoint for quick health checks
app.get('/api/ready', (req, res) => {
  res.json({ 
    status: 'ready', 
    started: new Date().toISOString(),
    responseTime: Date.now() - startTime + 'ms'
  });
});

// Serve static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Attempt MongoDB connection (non-blocking, after health checks)
if (MONGODB_URI && MONGODB_URI.startsWith('mongodb')) {
  console.log('🔄 Attempting MongoDB connection...');
  
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    socketTimeoutMS: 45000,
  })
  .then(() => {
    useRealMongoDB = true;
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    if (err.message.includes('whitelist')) {
      console.error('\n🔒 IP WHITELIST ISSUE:');
      console.error('1. Go to MongoDB Atlas → Network Access');
      console.error('2. Add IP Address: 0.0.0.0/0');
      console.error('3. Wait 2-3 minutes for changes to propagate');
    }
    useRealMongoDB = false;
  });
} else {
  console.log('ℹ️  No valid MongoDB URI found, using temporary authentication');
  useRealMongoDB = false;
}

// Handle MongoDB connection events
mongoose.connection?.on('error', err => {
  console.error('MongoDB connection error:', err.message);
  useRealMongoDB = false;
});

mongoose.connection?.on('disconnected', () => {
  console.log('MongoDB disconnected');
  useRealMongoDB = false;
});

// Import Route Handlers
let authRoutes, tempAuthRoutes;

try {
  authRoutes = require('./routes/auth');
  tempAuthRoutes = require('./routes/temp-auth');
  console.log('✅ Auth routes loaded successfully');
} catch (err) {
  console.error('❌ Failed to load auth routes:', err.message);
  // Create basic fallback routes if module loading fails
  tempAuthRoutes = require('./routes/temp-auth');
}

// Use appropriate auth routes based on connection status
app.use('/api/auth', (req, res, next) => {
  if (useRealMongoDB) {
    console.log('🔐 Using MongoDB authentication');
    require('./routes/auth')(req, res, next);
  } else {
    console.log('🔄 Using temporary authentication');
    require('./routes/temp-auth')(req, res, next);
  }
});

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  res.json({
    usingMongoDB: useRealMongoDB,
    status: useRealMongoDB ? 'Using MongoDB Authentication' : 'Using Temporary Authentication',
    database: useRealMongoDB ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Add after auth routes
const vaultRoutes = require('./routes/vault');
app.use('/api/vault', vaultRoutes);

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = './uploads';
const cardsDir = './cards';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}
if (!fs.existsSync(cardsDir)) {
  fs.mkdirSync(cardsDir, { recursive: true });
  console.log('Created cards directory');
}

// Debug endpoint to check IP (for whitelisting)
app.get('/api/ip', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({ 
    ip: clientIp, 
    message: 'Add this IP to MongoDB Atlas whitelist if needed',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (mongoose.connection?.readyState === 1) {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
  }
  process.exit(0);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  const initTime = Date.now() - startTime;
  console.log('🎉 Server started successfully!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`⏱️  Startup time: ${initTime}ms`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${useRealMongoDB ? 'MongoDB ✅' : 'Temporary (in-memory) 🔄'}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;