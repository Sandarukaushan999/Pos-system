const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { getDb } = require('../models/database');
const moment = require('moment');

const router = express.Router();

// Generate invoice number
function generateInvoiceNumber(db) {
  const date = moment().format('YYYYMMDD');
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM sales WHERE DATE(created_at) = ?', [moment().format('YYYY-MM-DD')], (err, row) => {
      if (err) return reject(err);
      resolve(`INV-${date}-${String((row.count || 0) + 1).padStart(3, '0')}`);
    });
  });
}

// Get all sales
router.get('/', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.all('SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id ORDER BY s.created_at DESC', [], (err, sales) => {
    if (err) return res.status(500).json({ success: false, error: 'Failed to get sales' });
    res.json({ success: true, sales });
  });
});

// Get sale by ID with items
router.get('/:id', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  db.get('SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id WHERE s.id = ?', [id], (err, sale) => {
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    db.all('SELECT * FROM sales_items WHERE sale_id = ?', [id], (err2, items) => {
      res.json({ success: true, sale: { ...sale, items } });
    });
  });
});

// Create new sale (billing)
router.post('/', authenticateToken, requireAuth, async (req, res) => {
  const db = getDb();
  const { items, paymentType, total } = req.body;
  console.log('Checkout request:', req.body);
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('Checkout error: No items in sale');
    return res.status(400).json({ error: 'No items in sale' });
  }
  if (!paymentType || !total) {
    console.log('Checkout error: Payment type and total are required');
    return res.status(400).json({ error: 'Payment type and total are required' });
  }
  // Validate items and check stock
  for (const item of items) {
    const stockItem = await new Promise((resolve) => db.get('SELECT * FROM stock_items WHERE barcode = ? AND status = "active"', [item.barcode], (err, row) => resolve(row)));
    if (!stockItem) {
      console.log(`Checkout error: Item with barcode ${item.barcode} not found or not active`);
      return res.status(400).json({ error: `Item with barcode ${item.barcode} not found or not active` });
    }
    if (stockItem.quantity < item.quantity) {
      console.log(`Checkout error: Insufficient stock for ${stockItem.name}`);
      return res.status(400).json({ error: `Insufficient stock for ${stockItem.name}` });
    }
    if (stockItem.expiry_date && moment(stockItem.expiry_date).isBefore(moment(), 'day')) {
      console.log(`Checkout error: Item ${stockItem.name} is expired`);
      return res.status(400).json({ error: `Item ${stockItem.name} is expired` });
    }
  }
  db.run('BEGIN TRANSACTION');
  // Insert with temporary invoice number
  db.run('INSERT INTO sales (invoice_number, total_amount, payment_type, cashier_id) VALUES (?, ?, ?, ?)',
    ['PENDING', total, paymentType, req.user.id],
    function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.log('Checkout error: Failed to create sale', err);
        return res.status(500).json({ error: 'Failed to create sale' });
      }
      const saleId = this.lastID;
      // Generate unique invoice number using saleId
      const invoice_number = `INV-${moment().format('YYYYMMDD')}-${String(saleId).padStart(4, '0')}`;
      db.run('UPDATE sales SET invoice_number = ? WHERE id = ?', [invoice_number, saleId], function(errInv) {
        if (errInv) {
          db.run('ROLLBACK');
          console.log('Checkout error: Failed to update invoice number', errInv);
          return res.status(500).json({ error: 'Failed to update invoice number' });
        }
        let errorOccurred = false;
        items.forEach((item, idx) => {
          db.run('INSERT INTO sales_items (sale_id, barcode, name, quantity, price, expiry_date) VALUES (?, ?, ?, ?, ?, ?)',
            [saleId, item.barcode, item.name, item.quantity, item.price, item.expiry_date || null],
            function(err2) {
              if (err2) {
                errorOccurred = true;
                console.log('Checkout error: Failed to insert sales item', err2);
              }
            });
          db.run('UPDATE stock_items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE barcode = ?',
            [item.quantity, item.barcode],
            function(err3) {
              if (err3) {
                errorOccurred = true;
                console.log('Checkout error: Failed to update stock', err3);
              }
            });
        });
        if (errorOccurred) {
          db.run('ROLLBACK');
          console.log('Checkout error: Failed to process sale items');
          return res.status(500).json({ error: 'Failed to process sale items' });
        }
        db.run('COMMIT');
        db.get('SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id WHERE s.id = ?', [saleId], (err4, sale) => {
          db.all('SELECT * FROM sales_items WHERE sale_id = ?', [saleId], (err5, saleItems) => {
            // Log each item in user_activity
            saleItems.forEach(item => {
              db.run('INSERT INTO user_activity (user_id, username, action, details) VALUES (?, ?, ?, ?)', [req.user.id, req.user.username, 'sale', JSON.stringify({ product: item.name, amount: item.price, quantity: item.quantity })]);
            });
            
            // Trigger dashboard refresh by adding a timestamp
            const refreshData = {
              timestamp: Date.now(),
              saleId: saleId,
              amount: total
            };
            
            res.json({ 
              success: true, 
              message: 'Sale completed successfully', 
              sale: { ...sale, items: saleItems },
              dashboardRefresh: refreshData
            });
          });
        });
      });
    });
});

// Get sales grouped by salesman
router.get('/grouped', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.all('SELECT u.username as salesman, COUNT(s.id) as transactionCount, SUM(s.total_amount) as totalSales FROM sales s LEFT JOIN users u ON s.cashier_id = u.id GROUP BY s.cashier_id', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to group sales by salesman' });
    res.json({ success: true, salesmanStats: rows });
  });
});

// Get top selling items
router.get('/stats/top-items', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.all('SELECT barcode, name, SUM(quantity) as total_quantity, SUM(quantity * price) as total_revenue FROM sales_items GROUP BY barcode, name ORDER BY total_quantity DESC LIMIT 10', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to get top selling items' });
    res.json({ success: true, topItems: rows });
  });
});

// Get sales statistics overview
router.get('/stats/overview', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.get('SELECT COUNT(*) as count, SUM(total_amount) as total FROM sales', [], (err, totalSales) => {
    db.all('SELECT payment_type, COUNT(*) as count, SUM(total_amount) as total FROM sales GROUP BY payment_type', [], (err2, salesByPayment) => {
      db.all('SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as total FROM sales GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30', [], (err3, dailySales) => {
        res.json({ success: true, stats: {
          totalSales: totalSales?.count || 0,
          totalAmount: totalSales?.total || 0,
          salesByPayment: salesByPayment || [],
          dailySales: dailySales || []
        }});
      });
    });
  });
});

// TEMP: Debug route to view users and sales data
router.get('/debug/all-users-sales', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM users', [], (err, users) => {
    if (err) return res.status(500).json({ error: 'Failed to get users' });
    db.all('SELECT * FROM sales', [], (err2, sales) => {
      if (err2) return res.status(500).json({ error: 'Failed to get sales' });
      res.json({ users, sales });
    });
  });
});

module.exports = router; 