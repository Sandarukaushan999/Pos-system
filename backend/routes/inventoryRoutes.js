const express = require('express');
const { authenticateToken, requireAuth, requireAdmin } = require('../middleware/auth');
const { db } = require('../models/database');
const moment = require('moment');

const router = express.Router();

// Get all stock items
router.get('/', authenticateToken, requireAuth, (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = `
      SELECT * FROM stock_items 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const items = db.prepare(query).all(...params);
    
    res.json({
      success: true,
      items
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get inventory items' 
    });
  }
});

// Get stock item by barcode
router.get('/barcode/:barcode', authenticateToken, requireAuth, (req, res) => {
  try {
    const { barcode } = req.params;
    
    const item = db.prepare('SELECT * FROM stock_items WHERE barcode = ?').get(barcode);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if item is expired
    const isExpired = item.expiry_date && moment(item.expiry_date).isBefore(moment(), 'day');
    const isNearExpiry = item.expiry_date && moment(item.expiry_date).diff(moment(), 'days') <= 30;

    res.json({
      success: true,
      item: {
        ...item,
        isExpired,
        isNearExpiry
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get item' 
    });
  }
});

// Add new stock item (barcode scanning)
router.post('/', authenticateToken, requireAuth, (req, res) => {
  try {
    const { barcode, name, quantity, price, expiry_date, reorder_level } = req.body;

    if (!barcode || !name || !quantity || !price) {
      return res.status(400).json({ error: 'Barcode, name, quantity, and price are required' });
    }

    // Check if item already exists
    const existingItem = db.prepare('SELECT id FROM stock_items WHERE barcode = ?').get(barcode);
    
    if (existingItem) {
      return res.status(400).json({ error: 'Item with this barcode already exists' });
    }

    // Insert new item with pending status
    const result = db.prepare(`
      INSERT INTO stock_items (barcode, name, quantity, price, expiry_date, status, reorder_level)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(barcode, name, quantity, price, expiry_date || null, reorder_level || 10);

    const newItem = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      message: 'Item added successfully (pending approval)',
      item: newItem
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to add item' 
    });
  }
});

// Update stock item
router.put('/:id', authenticateToken, requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, price, expiry_date, reorder_level, status } = req.body;

    // Check if item exists
    const existingItem = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id);
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update item
    const result = db.prepare(`
      UPDATE stock_items 
      SET name = ?, quantity = ?, price = ?, expiry_date = ?, reorder_level = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || existingItem.name,
      quantity !== undefined ? quantity : existingItem.quantity,
      price !== undefined ? price : existingItem.price,
      expiry_date || existingItem.expiry_date,
      reorder_level !== undefined ? reorder_level : existingItem.reorder_level,
      status || existingItem.status,
      id
    );

    const updatedItem = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update item' 
    });
  }
});

// Delete stock item
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM stock_items WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete item' 
    });
  }
});

// Get pending items for approval (admin only)
router.get('/pending', authenticateToken, requireAdmin, (req, res) => {
  try {
    const pendingItems = db.prepare('SELECT * FROM stock_items WHERE status = "pending" ORDER BY created_at DESC').all();
    
    res.json({
      success: true,
      items: pendingItems
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get pending items' 
    });
  }
});

// Approve/reject pending item (admin only)
router.put('/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { action, name, price, quantity, expiry_date, reorder_level } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND status = "pending"').get(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Pending item not found' });
    }

    if (action === 'approve') {
      // Update item with approved data
      db.prepare(`
        UPDATE stock_items 
        SET name = ?, price = ?, quantity = ?, expiry_date = ?, reorder_level = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name || item.name,
        price || item.price,
        quantity || item.quantity,
        expiry_date || item.expiry_date,
        reorder_level || item.reorder_level,
        id
      );
    } else {
      // Delete rejected item
      db.prepare('DELETE FROM stock_items WHERE id = ?').run(id);
    }

    res.json({
      success: true,
      message: `Item ${action}ed successfully`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to process approval' 
    });
  }
});

// Get low stock items
router.get('/low-stock', authenticateToken, requireAuth, (req, res) => {
  try {
    const lowStockItems = db.prepare(`
      SELECT * FROM stock_items 
      WHERE status = 'active' AND quantity <= reorder_level
      ORDER BY quantity ASC
    `).all();
    
    res.json({
      success: true,
      items: lowStockItems
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get low stock items' 
    });
  }
});

// Get expired/near expiry items
router.get('/expiry-alerts', authenticateToken, requireAuth, (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const thirtyDaysFromNow = moment().add(30, 'days').format('YYYY-MM-DD');

    const expiredItems = db.prepare(`
      SELECT * FROM stock_items 
      WHERE status = 'active' AND expiry_date < ?
      ORDER BY expiry_date ASC
    `).all(today);

    const nearExpiryItems = db.prepare(`
      SELECT * FROM stock_items 
      WHERE status = 'active' AND expiry_date >= ? AND expiry_date <= ?
      ORDER BY expiry_date ASC
    `).all(today, thirtyDaysFromNow);
    
    res.json({
      success: true,
      expired: expiredItems,
      nearExpiry: nearExpiryItems
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get expiry alerts' 
    });
  }
});

// Get inventory statistics
router.get('/stats', authenticateToken, requireAuth, (req, res) => {
  try {
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE status = "active"').get();
    const totalValue = db.prepare('SELECT SUM(quantity * price) as total FROM stock_items WHERE status = "active"').get();
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE status = "active" AND quantity <= reorder_level').get();
    const pendingCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE status = "pending"').get();
    
    const today = moment().format('YYYY-MM-DD');
    const expiredCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE status = "active" AND expiry_date < ?').get(today);
    
    res.json({
      success: true,
      stats: {
        totalItems: totalItems.count,
        totalValue: totalValue.total || 0,
        lowStockCount: lowStockCount.count,
        pendingCount: pendingCount.count,
        expiredCount: expiredCount.count
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get inventory stats' 
    });
  }
});

module.exports = router; 