const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists with that email or username.' });
        }

        // Create new user
        user = new User({ username, email, password });
        await user.save();

        // Create JWT payload
        const payload = { id: user._id };

        // Sign token
        jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) {
                console.error('JWT signing error:', err);
                return res.status(500).json({ message: 'Server error during registration.' });
            }
            
            res.status(201).json({
                token,
                user: { 
                    id: user._id, 
                    username: user.username, 
                    email: user.email, 
                    isSubscribed: user.isSubscribed 
                }
            });
        });

    } catch (err) {
        console.error('Registration error:', err);
        
        // Provide better error messages
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: errors 
            });
        }
        
        // Handle duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            return res.status(400).json({ 
                message: `User with this ${field} already exists.` 
            });
        }
        
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Check password
        const isMatch = await user.correctPassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Create JWT payload
        const payload = { id: user._id };

        // Sign token
        jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) {
                console.error('JWT signing error:', err);
                return res.status(500).json({ message: 'Server error during login.' });
            }
            
            res.json({
                token,
                user: { 
                    id: user._id, 
                    username: user.username, 
                    email: user.email, 
                    isSubscribed: user.isSubscribed 
                }
            });
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// @route   GET /api/auth/user
// @desc    Get current user data (protected route)
router.get('/user', auth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ message: 'Server error fetching user data.' });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
router.post('/logout', (req, res) => {
    // JWT is stateless, so logout is handled client-side by removing the token
    res.json({ message: 'Logged out successfully.' });
});

module.exports = router;