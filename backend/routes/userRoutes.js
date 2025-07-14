const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { db } = require('../models/database');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, role, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get users' 
    });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const user = db.prepare(`
      SELECT id, username, role, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `).get(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user' 
    });
  }
});

// Update user role (admin only)
router.put('/:id/role', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "cashier"' });
    }

    // Prevent admin from changing their own role
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = db.prepare(`
      UPDATE users 
      SET role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(role, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = db.prepare(`
      SELECT id, username, role, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user role' 
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user' 
    });
  }
});

// Get user activity (admin only)
router.get('/:id/activity', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    let dateFilter = '';
    const params = [id];

    switch (period) {
      case 'today':
        dateFilter = 'AND DATE(created_at) = DATE("now")';
        break;
      case 'week':
        dateFilter = 'AND created_at >= DATE("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'AND created_at >= DATE("now", "-30 days")';
        break;
      case 'year':
        dateFilter = 'AND created_at >= DATE("now", "-365 days")';
        break;
    }

    // Get sales by user
    const sales = db.prepare(`
      SELECT COUNT(*) as count, SUM(total_amount) as total
      FROM sales 
      WHERE cashier_id = ? ${dateFilter}
    `).get(...params);

    // Get expenses by user
    const expenses = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM expenses 
      WHERE created_by = ? ${dateFilter}
    `).get(...params);

    res.json({
      success: true,
      activity: {
        sales: {
          count: sales.count || 0,
          total: sales.total || 0
        },
        expenses: {
          count: expenses.count || 0,
          total: expenses.total || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user activity' 
    });
  }
});

module.exports = router; 