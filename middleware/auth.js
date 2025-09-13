const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production'; // Use env var later!

const auth = async (req, res, next) => {
    try {
        // 1) Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied.' });
        }

        // 2) Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3) Find user and attach to request object
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Token is not valid.' });
        }

        req.user = user; // { id, username, email, isSubscribed }
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(401).json({ message: 'Token is not valid.' });
    }
};

module.exports = { auth, JWT_SECRET };