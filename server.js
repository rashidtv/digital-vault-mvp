require('dotenv').config(); // Add this at the very top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import Route Handlers
const authRoutes = require('./routes/auth');

// Initialize Express App
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Replace your mongoose.connect code with this:
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

app.get('/api/ip', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.json({ ip: clientIp, message: 'Add this IP to MongoDB Atlas whitelist' });
});

mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.log('MONGODB_URI value:', MONGODB_URI ? 'Set (hidden for security)' : 'Not set');
});

// ... rest of your server.js code remains the same

// Use Routes
app.use('/api/auth', authRoutes);

// Serve the main landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ message: 'Server is up and running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));