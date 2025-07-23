const express = require('express');
const { authenticateToken, requireAuth, requireAdmin, hashPassword, generateToken, login } = require('../middleware/auth');
const { getDb } = require('../models/database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  try {
    const user = await login(username, password);
    const token = generateToken(user);
    res.json({ success: true, user, token });
  } catch (err) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

// Register new user (admin only)
router.post('/register', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role are required' });
  try {
    const db = getDb();
    const hash = await hashPassword(password);
    db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role], function(err) {
      if (err) return res.status(400).json({ error: 'Username already exists' });
      res.json({ success: true, user: { id: this.lastID, username, role } });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  });
});

// Change password
router.post('/change-password', authenticateToken, requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new password required' });
  const db = getDb();
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    const match = await require('../middleware/auth').comparePassword(oldPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Old password incorrect' });
    const hash = await hashPassword(newPassword);
    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, req.user.id], function(err2) {
      if (err2) return res.status(500).json({ error: 'Failed to update password' });
      res.json({ success: true, message: 'Password updated' });
    });
  });
});

module.exports = router; 