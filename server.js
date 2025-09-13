require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Initialize Express App
const app = express();

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

// Debug MongoDB connection
console.log('MongoDB URI starts with:', MONGODB_URI ? MONGODB_URI.substring(0, 20) + '...' : 'Not set');

if (MONGODB_URI && !MONGODB_URI.startsWith('mongodb')) {
  console.error('ERROR: MONGODB_URI does not start with mongodb:// or mongodb+srv://');
}

let useRealMongoDB = false;

// Attempt MongoDB connection but don't block server startup
if (MONGODB_URI && MONGODB_URI.startsWith('mongodb')) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
      useRealMongoDB = true;
    })
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err.message);
      if (err.message.includes('whitelist')) {
        console.error('\n🔒 IP WHITELIST ERROR:');
        console.error('Your Render server IP is not whitelisted in MongoDB Atlas');
        console.error('1. Go to MongoDB Atlas → Network Access');
        console.error('2. Add IP Address: 0.0.0.0/0 (for development)');
        console.error('3. Wait 1-2 minutes for changes to take effect');
      }
      useRealMongoDB = false;
    });
} else {
  console.log('ℹ️  No valid MongoDB URI found, using temporary authentication');
  useRealMongoDB = false;
}

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
  useRealMongoDB = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  useRealMongoDB = false;
});

// Import Route Handlers
const authRoutes = require('./routes/auth');
const tempAuthRoutes = require('./routes/temp-auth');

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

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: useRealMongoDB ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({
    usingMongoDB: useRealMongoDB,
    status: useRealMongoDB ? 'Using MongoDB Authentication' : 'Using Temporary Authentication',
    database: useRealMongoDB ? 'Connected' : 'Disconnected'
  });
});

// Debug endpoint to check IP (for whitelisting)
app.get('/api/ip', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({ 
    ip: clientIp, 
    message: 'Add this IP to MongoDB Atlas whitelist if needed',
    headers: req.headers 
  });
});

// Serve the main landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard page
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
  process.exit(0);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Available at: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${useRealMongoDB ? 'MongoDB' : 'Temporary (in-memory)'}`);
});