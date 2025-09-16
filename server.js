require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

console.log('📦 MongoDB URI provided:', MONGODB_URI ? 'Yes' : 'No');
console.log('🔗 Connecting to MongoDB...');

// Connect to MongoDB with better error handling
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    if (err.message.includes('whitelist')) {
      console.error('\n🔒 IP WHITELIST ISSUE:');
      console.error('1. Go to MongoDB Atlas → Network Access');
      console.error('2. Add IP Address: 0.0.0.0/0 (allow all IPs)');
      console.error('3. Wait 1-2 minutes for changes to take effect');
    }
    if (err.message.includes('auth failed')) {
      console.error('\n🔐 AUTHENTICATION ISSUE:');
      console.error('1. Check your MongoDB username and password');
      console.error('2. Make sure database user has correct permissions');
    }
    console.error('🔄 Continuing with server startup...');
  });

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 MongoDB disconnected');
});

// Ensure uploads directory exists
const uploadsDir = './uploads';
const cardsDir = './cards';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

if (!fs.existsSync(cardsDir)) {
  fs.mkdirSync(cardsDir, { recursive: true });
  console.log('📁 Created cards directory');
}

// Health check endpoints - MUST COME FIRST for Render monitoring
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    startupTime: Date.now() - startTime + 'ms',
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK', 
    message: 'API is healthy',
    database: dbStatus
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

// Import Route Handlers
const authRoutes = require('./routes/auth');
const vaultRoutes = require('./routes/vault');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    usingMongoDB: dbStatus === 'connected',
    status: dbStatus === 'connected' ? 'Using MongoDB Authentication' : 'MongoDB Disconnected',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check IP (for whitelisting)
app.get('/api/ip', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({ 
    ip: clientIp, 
    message: 'Add this IP to MongoDB Atlas whitelist if needed',
    timestamp: new Date().toISOString()
  });
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
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  const initTime = Date.now() - startTime;
  const dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected';
  
  console.log('🎉 Server started successfully!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`⏱️  Startup time: ${initTime}ms`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🌐 External: https://digital-vault-mvp.onrender.com`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB: ${dbStatus}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log('✅ Endpoints available:');
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - API Health: http://localhost:${PORT}/api/health`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Vault: http://localhost:${PORT}/api/vault`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit process in production, just log
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
  }
  
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('⚠️  Forcing shutdown...');
    process.exit(1);
  }, 5000);
});

module.exports = app;