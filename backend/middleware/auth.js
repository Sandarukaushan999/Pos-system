const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb, getAsync, runAsync } = require('../models/database');

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

// Login function (refactored for sqlite3 async)
const login = async (username, password) => {
  const db = getDb();
  try {
    const user = await getAsync(db, 'SELECT * FROM users WHERE username = ?', [username]);
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
  } finally {
    db.close();
  }
};

// Register new user (admin only, refactored for sqlite3 async)
const registerUser = async (username, password, role = 'cashier') => {
  const db = getDb();
  try {
    // Check if user already exists
    const existingUser = await getAsync(db, 'SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Insert new user
    await runAsync(db, `
      INSERT INTO users (username, password_hash, role) 
      VALUES (?, ?, ?)
    `, [username, passwordHash, role]);
    return {
      username,
      role
    };
  } catch (error) {
    throw error;
  } finally {
    db.close();
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