const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'pos-system-secret-key-2024';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is admin or cashier
const requireAuth = (req, res, next) => {
  if (!['admin', 'cashier'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  next();
};

// Login function
const login = async (username, password) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken(user);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    };
  } catch (error) {
    throw error;
  }
};

// Register new user (admin only)
const registerUser = async (username, password, role = 'cashier') => {
  try {
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert new user
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role) 
      VALUES (?, ?, ?)
    `).run(username, passwordHash, role);

    return {
      id: result.lastInsertRowid,
      username,
      role
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAuth,
  login,
  registerUser,
  generateToken
}; 