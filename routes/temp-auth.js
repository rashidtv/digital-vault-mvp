const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// In-memory user storage (for demo only!)
let users = [];
let nextId = 1;

// Temporary register endpoint
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user exists
        const userExists = users.find(u => u.email === email || u.username === username);
        if (userExists) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create user
        const user = { 
            id: nextId++, 
            username, 
            email, 
            password: hashedPassword,
            isSubscribed: true 
        };
        
        users.push(user);

        // Create JWT
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            token,
            user: { id: user.id, username: user.username, email: user.email, isSubscribed: user.isSubscribed }
        });

    } catch (err) {
        console.error('Temp auth registration error:', err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Temporary login endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Create JWT
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            token,
            user: { id: user.id, username: user.username, email: user.email, isSubscribed: user.isSubscribed }
        });

    } catch (err) {
        console.error('Temp auth login error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Get current user
router.get('/user', (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.id);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token.' });
        }

        res.json({ 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            isSubscribed: user.isSubscribed 
        });
    } catch (err) {
        res.status(401).json({ message: 'Invalid token.' });
    }
});

module.exports = router;