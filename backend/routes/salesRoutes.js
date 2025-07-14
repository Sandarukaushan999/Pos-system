const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { db } = require('../models/database');
const moment = require('moment');

const router = express.Router();

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = moment().format('YYYYMMDD');
  const count = db.prepare('SELECT COUNT(*) as count FROM sales WHERE DATE(created_at) = ?').get(date);
  return `INV-${date}-${String(count.count + 1).padStart(3, '0')}`;
};

// Get all sales
router.get('/', authenticateToken, requireAuth, (req, res) => {
  try {
    const { start_date, end_date, payment_type } = req.query;
    
    let query = `
      SELECT s.*, u.username as cashier_name 
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    if (payment_type) {
      query += ' AND s.payment_type = ?';
      params.push(payment_type);
    }

    query += ' ORDER BY s.created_at DESC';

    const sales = db.prepare(query).all(...params);
    
    res.json({
      success: true,
      sales
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get sales' 
    });
  }
});

// Get sale by ID with items
router.get('/:id', authenticateToken, requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = db.prepare(`
      SELECT s.*, u.username as cashier_name 
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      WHERE s.id = ?
    `).get(id);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = db.prepare('SELECT * FROM sales_items WHERE sale_id = ?').all(id);
    
    res.json({
      success: true,
      sale: {
        ...sale,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get sale' 
    });
  }
});

// Create new sale (billing)
router.post('/', authenticateToken, requireAuth, (req, res) => {
  try {
    const { items, payment_type, total_amount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    if (!payment_type || !total_amount) {
      return res.status(400).json({ error: 'Payment type and total amount are required' });
    }

    // Validate items and check stock
    for (const item of items) {
      const stockItem = db.prepare('SELECT * FROM stock_items WHERE barcode = ? AND status = "active"').get(item.barcode);
      
      if (!stockItem) {
        return res.status(400).json({ error: `Item with barcode ${item.barcode} not found or not active` });
      }

      if (stockItem.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${stockItem.name}` });
      }

      // Check if item is expired
      if (stockItem.expiry_date && moment(stockItem.expiry_date).isBefore(moment(), 'day')) {
        return res.status(400).json({ error: `Item ${stockItem.name} is expired` });
      }
    }

    // Generate invoice number
    const invoice_number = generateInvoiceNumber();

    // Start transaction
    const transaction = db.transaction(() => {
      // Create sale record
      const saleResult = db.prepare(`
        INSERT INTO sales (invoice_number, total_amount, payment_type, cashier_id)
        VALUES (?, ?, ?, ?)
      `).run(invoice_number, total_amount, payment_type, req.user.id);

      const saleId = saleResult.lastInsertRowid;

      // Insert sale items and update stock
      for (const item of items) {
        // Insert sale item
        db.prepare(`
          INSERT INTO sales_items (sale_id, barcode, name, quantity, price, expiry_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(saleId, item.barcode, item.name, item.quantity, item.price, item.expiry_date);

        // Update stock quantity
        db.prepare(`
          UPDATE stock_items 
          SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
          WHERE barcode = ?
        `).run(item.quantity, item.barcode);
      }

      return saleId;
    });

    const saleId = transaction();

    // Get the created sale with items
    const sale = db.prepare(`
      SELECT s.*, u.username as cashier_name 
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      WHERE s.id = ?
    `).get(saleId);

    const saleItems = db.prepare('SELECT * FROM sales_items WHERE sale_id = ?').all(saleId);

    res.json({
      success: true,
      message: 'Sale completed successfully',
      sale: {
        ...sale,
        items: saleItems
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to create sale' 
    });
  }
});

// Get sales statistics
router.get('/stats/overview', authenticateToken, requireAuth, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    const params = [];

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

    const totalSales = db.prepare(`
      SELECT COUNT(*) as count, SUM(total_amount) as total 
      FROM sales 
      WHERE 1=1 ${dateFilter}
    `).get(...params);

    const salesByPayment = db.prepare(`
      SELECT payment_type, COUNT(*) as count, SUM(total_amount) as total
      FROM sales 
      WHERE 1=1 ${dateFilter}
      GROUP BY payment_type
    `).all(...params);

    const dailySales = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as total
      FROM sales 
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `).all(...params);

    res.json({
      success: true,
      stats: {
        totalSales: totalSales.count || 0,
        totalAmount: totalSales.total || 0,
        salesByPayment,
        dailySales
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get sales statistics' 
    });
  }
});

// Get top selling items
router.get('/stats/top-items', authenticateToken, requireAuth, (req, res) => {
  try {
    const { limit = 10, period = 'month' } = req.query;
    
    let dateFilter = '';
    const params = [];

    switch (period) {
      case 'today':
        dateFilter = 'AND DATE(si.created_at) = DATE("now")';
        break;
      case 'week':
        dateFilter = 'AND si.created_at >= DATE("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'AND si.created_at >= DATE("now", "-30 days")';
        break;
      case 'year':
        dateFilter = 'AND si.created_at >= DATE("now", "-365 days")';
        break;
    }

    const topItems = db.prepare(`
      SELECT 
        si.barcode,
        si.name,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.price) as total_revenue,
        COUNT(DISTINCT si.sale_id) as sale_count
      FROM sales_items si
      WHERE 1=1 ${dateFilter}
      GROUP BY si.barcode, si.name
      ORDER BY total_quantity DESC
      LIMIT ?
    `).all(limit, ...params);

    res.json({
      success: true,
      topItems
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get top selling items' 
    });
  }
});

// Delete sale (admin only)
router.delete('/:id', authenticateToken, requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get sale items to restore stock
    const saleItems = db.prepare('SELECT barcode, quantity FROM sales_items WHERE sale_id = ?').all(id);

    // Start transaction
    const transaction = db.transaction(() => {
      // Restore stock quantities
      for (const item of saleItems) {
        db.prepare(`
          UPDATE stock_items 
          SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE barcode = ?
        `).run(item.quantity, item.barcode);
      }

      // Delete sale items (cascade will handle this, but explicit for clarity)
      db.prepare('DELETE FROM sales_items WHERE sale_id = ?').run(id);

      // Delete sale
      const result = db.prepare('DELETE FROM sales WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        throw new Error('Sale not found');
      }
    });

    transaction();

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete sale' 
    });
  }
});

module.exports = router; 