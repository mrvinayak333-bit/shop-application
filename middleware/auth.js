const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'shree_raam_mobile_secure_key_2026';

// Verify JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Role-Based Authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const allowedRoles = [...roles];
    // If admin is authorized, staff is also authorized (full access control)
    if (allowedRoles.includes('admin') && !allowedRoles.includes('staff')) {
      allowedRoles.push('staff');
    }
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. ${userRole} is not authorized for this resource.` 
      });
    }
    next();
  };
};

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role,
      name: user.name,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = { authenticateToken, authorize, generateToken, generateRefreshToken };
