const express = require('express');
const { authenticateToken, requireAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../models/database');
const moment = require('moment');

const router = express.Router();

// Get all stock items
router.get('/', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { status, search } = req.query;
  let query = 'SELECT * FROM stock_items WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) { query += ' AND (name LIKE ? OR barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, items) => {
    if (err) return res.status(500).json({ success: false, error: 'Failed to get inventory items' });
    res.json({ success: true, items });
  });
});

// Get stock items by barcode (returns all items with same barcode)
router.get('/barcode/:barcode', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { barcode } = req.params;
  db.all('SELECT * FROM stock_items WHERE barcode = ? ORDER BY expiry_date ASC, created_at DESC', [barcode], (err, items) => {
    if (err) return res.status(500).json({ success: false, error: 'Failed to fetch items' });
    if (!items || items.length === 0) return res.status(404).json({ success: false, error: 'No items found with this barcode' });
    
    // Add expiry status to each item
    const itemsWithStatus = items.map(item => {
      const isExpired = item.expiry_date && moment(item.expiry_date).isBefore(moment(), 'day');
      const isNearExpiry = item.expiry_date && moment(item.expiry_date).diff(moment(), 'days') <= 30;
      return { ...item, isExpired, isNearExpiry };
    });
    
    res.json({ 
      success: true, 
      items: itemsWithStatus,
      count: itemsWithStatus.length,
      // Return the first active item as the primary item for backward compatibility
      item: itemsWithStatus.find(item => item.status === 'active') || itemsWithStatus[0]
    });
  });
});

// Add new stock item (pending)
router.post('/', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { barcode, name, quantity, price, buying_price, expiry_date, reorder_level } = req.body;
  if (!barcode || !name || !quantity || !price) return res.status(400).json({ error: 'Barcode, name, quantity, and price are required' });
  
  // Check if item with same barcode and expiry date exists
  db.get('SELECT id FROM stock_items WHERE barcode = ? AND expiry_date = ?', [barcode, expiry_date || null], (err, existing) => {
    if (existing) {
      return res.status(400).json({ 
        error: 'Item with this barcode and expiry date already exists. Please update the existing item instead.' 
      });
    }
    
    db.run('INSERT INTO stock_items (barcode, name, quantity, price, buying_price, expiry_date, status, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [barcode, name, quantity, price, buying_price || price, expiry_date || null, 'pending', reorder_level || 10],
      function(err2) {
        if (err2) return res.status(500).json({ error: 'Failed to add item' });
        db.get('SELECT * FROM stock_items WHERE id = ?', [this.lastID], (err3, newItem) => {
          res.json({ success: true, message: 'Item added successfully (pending approval)', item: newItem });
        });
      });
  });
});

// Update stock item
router.put('/:id', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, quantity, price, buying_price, expiry_date, reorder_level, status } = req.body;
  db.get('SELECT * FROM stock_items WHERE id = ?', [id], (err, existing) => {
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    db.run('UPDATE stock_items SET name = ?, quantity = ?, price = ?, buying_price = ?, expiry_date = ?, reorder_level = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || existing.name, quantity !== undefined ? quantity : existing.quantity, price !== undefined ? price : existing.price, buying_price !== undefined ? buying_price : existing.buying_price, expiry_date || existing.expiry_date, reorder_level !== undefined ? reorder_level : existing.reorder_level, status || existing.status, id],
      function(err2) {
        if (err2) return res.status(500).json({ error: 'Failed to update item' });
        db.get('SELECT * FROM stock_items WHERE id = ?', [id], (err3, updated) => {
          res.json({ success: true, message: 'Item updated successfully', item: updated });
        });
      });
  });
});

// Delete stock item (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  db.run('DELETE FROM stock_items WHERE id = ?', [id], function(err) {
    if (err || this.changes === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true, message: 'Item deleted successfully' });
  });
});

// Get pending items for approval (admin only)
router.get('/pending', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM stock_items WHERE status = "pending" ORDER BY created_at DESC', [], (err, items) => {
    if (err) return res.status(500).json({ error: 'Failed to get pending items' });
    res.json({ success: true, items });
  });
});

// Approve/reject pending item (admin only)
router.put('/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { action, name, price, buying_price, quantity, expiry_date, reorder_level } = req.body;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
  db.get('SELECT * FROM stock_items WHERE id = ? AND status = "pending"', [id], (err, item) => {
    if (!item) return res.status(404).json({ error: 'Pending item not found' });
    if (action === 'approve') {
      db.run('UPDATE stock_items SET name = ?, price = ?, buying_price = ?, quantity = ?, expiry_date = ?, reorder_level = ?, status = "active", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name || item.name, price || item.price, buying_price || item.buying_price || item.price, quantity || item.quantity, expiry_date || item.expiry_date, reorder_level || item.reorder_level, id],
        function(err2) {
          if (err2) return res.status(500).json({ error: 'Failed to approve item' });
          res.json({ success: true, message: 'Item approved successfully' });
        });
    } else {
      db.run('DELETE FROM stock_items WHERE id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ error: 'Failed to reject item' });
        res.json({ success: true, message: 'Item rejected and deleted' });
      });
    }
  });
});

// Get low stock items
router.get('/low-stock', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM stock_items WHERE status = "active" AND quantity <= reorder_level ORDER BY quantity ASC', [], (err, items) => {
    if (err) return res.status(500).json({ error: 'Failed to get low stock items' });
    res.json({ success: true, items });
  });
});

// Get expired/near expiry items
router.get('/expiry-alerts', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const today = moment().format('YYYY-MM-DD');
  const thirtyDaysFromNow = moment().add(30, 'days').format('YYYY-MM-DD');
  db.all('SELECT * FROM stock_items WHERE status = "active" AND expiry_date < ? ORDER BY expiry_date ASC', [today], (err, expired) => {
    db.all('SELECT * FROM stock_items WHERE status = "active" AND expiry_date >= ? AND expiry_date <= ? ORDER BY expiry_date ASC', [today, thirtyDaysFromNow], (err2, nearExpiry) => {
      res.json({ success: true, expired: expired || [], nearExpiry: nearExpiry || [] });
    });
  });
});

// Update stock quantity for existing item
router.put('/:id/update-stock', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { quantity, expiry_date } = req.body;
  
  if (quantity === undefined) {
    return res.status(400).json({ error: 'Quantity is required' });
  }
  
  db.get('SELECT * FROM stock_items WHERE id = ?', [id], (err, item) => {
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    const newQuantity = parseInt(item.quantity) + parseInt(quantity);
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }
    
    db.run('UPDATE stock_items SET quantity = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newQuantity, expiry_date || item.expiry_date, id],
      function(err2) {
        if (err2) return res.status(500).json({ error: 'Failed to update stock quantity' });
        db.get('SELECT * FROM stock_items WHERE id = ?', [id], (err3, updated) => {
          res.json({ 
            success: true, 
            message: `Stock quantity updated successfully. New quantity: ${newQuantity}`,
            item: updated 
          });
        });
      });
  });
});

// Get inventory statistics
router.get('/stats', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "active"', [], (err, totalItems) => {
    db.get('SELECT SUM(quantity * price) as total FROM stock_items WHERE status = "active"', [], (err2, totalValue) => {
      db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "active" AND quantity <= reorder_level', [], (err3, lowStockCount) => {
        db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "pending"', [], (err4, pendingCount) => {
          const today = moment().format('YYYY-MM-DD');
          db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "active" AND expiry_date < ?', [today], (err5, expiredCount) => {
            res.json({ success: true, stats: {
              totalItems: totalItems?.count || 0,
              totalValue: totalValue?.total || 0,
              lowStockCount: lowStockCount?.count || 0,
              pendingCount: pendingCount?.count || 0,
              expiredCount: expiredCount?.count || 0
            }});
          });
        });
      });
    });
  });
});

module.exports = router; 