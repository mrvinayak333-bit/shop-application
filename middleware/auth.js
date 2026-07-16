const jwt = require('jsonwebtoken');
require('dotenv').config();

// Unified Secret with fallback for safety
const JWT_SECRET = process.env.JWT_SECRET || 'shree_raam_mobile_secret_key_2026_default';

/**
 * AUTHENTICATE TOKEN MIDDLEWARE
 * Extracts and verifies JWT from Authorization header or Cookies
 */
const authenticateToken = (req, res, next) => {
  let token = null;

  // 1. Check Authorization Header (Bearer Token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fallback to Cookies if implemented (cookieParser required in server.js)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login to continue.',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    const message = err.name === 'TokenExpiredError' ? 'Session expired. Please login again.' : 'Invalid session. Please login again.';
    return res.status(403).json({
      success: false,
      message: message,
      code: 'AUTH_INVALID'
    });
  }
};

/**
 * ROLE-BASED AUTHORIZATION MIDDLEWARE
 * Checks if the authenticated user has one of the allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission denied. Access restricted to: ${roles.join(', ')}.`
      });
    }
    next();
  };
};

/**
 * GENERATE JWT TOKEN
 * Creates a signed token valid for the configured duration
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role,
      name: user.name,
      email: user.email || user.mobile || user.studentId
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = { authenticateToken, authorize, generateToken };
