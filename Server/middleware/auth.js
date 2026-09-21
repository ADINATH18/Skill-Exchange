import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                message: 'Access denied. No token provided.'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');

            return res.status(500).json({
                message: 'Server authentication is not configured.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded._id).select('-password');

        if (!user) {
            return res.status(401).json({
                message: 'Invalid token.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);

        return res.status(401).json({
            message: 'Invalid or expired token.'
        });
    }
};