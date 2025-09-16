const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        // Create new user
        user = new User({ username, email, password });
        await user.save();

        // Create JWT
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                isSubscribed: user.isSubscribed 
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                message: 'Validation failed',
                errors 
            });
        }
        
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Check password
        const isMatch = await user.correctPassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Create JWT
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            token,
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                isSubscribed: user.isSubscribed 
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Get current user
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ message: 'Server error fetching user.' });
    }
});

module.exports = router;