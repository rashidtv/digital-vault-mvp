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

// Connect to MongoDB (using environment variable)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-vault-mvp';

mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log('MongoDB connection error:', err));

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