const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { getDb } = require('../models/database');
const moment = require('moment');
const smsService = require('../services/smsService');

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
  const { items, paymentType, total, customerMobile, customerName } = req.body;
  console.log('Checkout request:', req.body);
  console.log('User:', req.user);
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('Checkout error: No items in sale');
    return res.status(400).json({ error: 'No items in sale' });
  }
  if (!paymentType || !total) {
    console.log('Checkout error: Payment type and total are required');
    return res.status(400).json({ error: 'Payment type and total are required' });
  }

  try {
    // Validate items and check stock
    for (const item of items) {
      const stockItem = await new Promise((resolve) => 
        db.get('SELECT * FROM stock_items WHERE barcode = ? AND status = "active"', [item.barcode], (err, row) => resolve(row))
      );
      
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

    // Generate invoice number first
    const invoice_number = await generateInvoiceNumber(db);
    
    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Insert sale with proper invoice number and customer info
      db.run('INSERT INTO sales (invoice_number, total_amount, payment_type, cashier_id, total_profit, customer_mobile, customer_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [invoice_number, total, paymentType, req.user.id, 0, customerMobile || null, customerName || null],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.log('Checkout error: Failed to create sale', err);
            return res.status(500).json({ error: 'Failed to create sale' });
          }
          
          const saleId = this.lastID;
          let totalProfit = 0;
          let processedItems = 0;
          let errorOccurred = false;
          
          // Process each item
          items.forEach((item, idx) => {
            db.get('SELECT buying_price FROM stock_items WHERE barcode = ?', [item.barcode], (err, stockItem) => {
              if (err) {
                errorOccurred = true;
                console.log('Checkout error: Failed to get stock item', err);
                return;
              }

              const buyingPrice = stockItem ? stockItem.buying_price : 0;
              const itemProfit = (item.price - buyingPrice) * item.quantity;
              totalProfit += itemProfit;

              db.run('INSERT INTO sales_items (sale_id, barcode, name, quantity, price, buying_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [saleId, item.barcode, item.name, item.quantity, item.price, buyingPrice, item.expiry_date || null],
                function(err2) {
                  if (err2) {
                    errorOccurred = true;
                    console.log('Checkout error: Failed to insert sales item', err2);
                    return;
                  }

                  db.run('UPDATE stock_items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE barcode = ?',
                    [item.quantity, item.barcode],
                    function(err3) {
                      if (err3) {
                        errorOccurred = true;
                        console.log('Checkout error: Failed to update stock', err3);
                        return;
                      }

                      processedItems++;

                      // If all items processed, commit transaction
                      if (processedItems === items.length) {
                        if (errorOccurred) {
                          db.run('ROLLBACK');
                          console.log('Checkout error: Failed to process sale items');
                          return res.status(500).json({ error: 'Failed to process sale items' });
                        }

                        db.run('UPDATE sales SET total_profit = ? WHERE id = ?', [totalProfit, saleId], function(err4) {
                          if (err4) {
                            console.log('Checkout error: Failed to update sale profit', err4);
                          }

                          db.run('COMMIT', function(err5) {
                            if (err5) {
                              console.log('Checkout error: Failed to commit transaction', err5);
                              return res.status(500).json({ error: 'Failed to commit transaction' });
                            }

                            db.get('SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id WHERE s.id = ?', [saleId], (err6, sale) => {
                              db.all('SELECT * FROM sales_items WHERE sale_id = ?', [saleId], (err7, saleItems) => {
                                if (err6 || err7) {
                                  console.log('Checkout error: Failed to get final sale data', err6 || err7);
                                  return res.status(500).json({ error: 'Failed to get final sale data' });
                                }

                                saleItems.forEach((item) => {
                                  db.run('INSERT INTO user_activity (user_id, username, action, details) VALUES (?, ?, ?, ?)',
                                    [req.user.id, req.user.username, 'sale', JSON.stringify({
                                      product: item.name,
                                      amount: item.price,
                                      quantity: item.quantity,
                                    })]
                                  );
                                });

                                const refreshData = {
                                  timestamp: Date.now(),
                                  saleId: saleId,
                                  amount: total,
                                };

                                res.json({
                                  success: true,
                                  message: 'Sale completed successfully',
                                  sale: { ...sale, items: saleItems },
                                  dashboardRefresh: refreshData,
                                });
                              });
                            });
                          });
                        });
                      }
                    }
                  );
                }
              );
            });
          });
        }
      );
    });
  } catch (error) {
    console.log('Checkout error:', error);
    console.log('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error during checkout: ' + error.message });
  }
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

// Send invoice via SMS
router.post('/:id/send-invoice', authenticateToken, requireAuth, async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { mobileNumber } = req.body;
  
  console.log('Send invoice request:', { id, mobileNumber });
  
  if (!mobileNumber) {
    console.log('Error: Mobile number is required');
    return res.status(400).json({ error: 'Mobile number is required' });
  }
  
  // Validate and format phone number
  const formattedNumber = smsService.validatePhoneNumber(mobileNumber);
  console.log('Formatted phone number:', formattedNumber);
  
  if (!formattedNumber) {
    console.log('Error: Invalid phone number format');
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  
  try {
    // Get sale details with items
    const sale = await new Promise((resolve, reject) => {
      db.get('SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id WHERE s.id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Get sale items
    const items = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM sales_items WHERE sale_id = ?', [id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    // Send SMS invoice
    console.log('Sending SMS invoice to:', formattedNumber);
    console.log('Sale data:', sale);
    console.log('Items data:', items);
    
    const smsResult = await smsService.sendInvoice(formattedNumber, { sale, items });
    console.log('SMS result:', smsResult);
    
    if (smsResult.success) {
      // Update sale with sent status (optional)
      db.run('UPDATE sales SET customer_mobile = ? WHERE id = ?', [formattedNumber, id], (err) => {
        if (err) {
          console.log('Failed to update customer mobile:', err);
        }
      });
      
      res.json({ 
        success: true, 
        message: 'Invoice sent successfully',
        messageId: smsResult.messageId,
        phoneNumber: formattedNumber
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send SMS: ' + smsResult.error 
      });
    }
    
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

module.exports = router; 