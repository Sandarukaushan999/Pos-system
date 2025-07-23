const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../models/database');

const router = express.Router();

// List all users
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  db.all('SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC', [], (err, users) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch users' });
    res.json({ success: true, users });
  });
});

// Update user role
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Role is required' });
  db.run('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, id], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'User not found or failed to update' });
    res.json({ success: true, message: 'User updated successfully' });
  });
});

// Delete user
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'User not found or failed to delete' });
    res.json({ success: true, message: 'User deleted successfully' });
  });
});

module.exports = router; 