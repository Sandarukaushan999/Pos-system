const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const DB_PATH = path.join(__dirname, '../../database.db');

// Export all data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const db = new sqlite3.Database(DB_PATH);
    
    // Get all data from all tables
    const exportData = {};
    
    // Get users
    db.all('SELECT * FROM users', [], (err, users) => {
      if (err) {
        db.close();
        return res.status(500).json({ success: false, error: 'Failed to export users' });
      }
      exportData.users = users;
      
      // Get stock items
      db.all('SELECT * FROM stock_items', [], (err, stockItems) => {
        if (err) {
          db.close();
          return res.status(500).json({ success: false, error: 'Failed to export stock items' });
        }
        exportData.stock_items = stockItems;
        
        // Get sales
        db.all('SELECT * FROM sales', [], (err, sales) => {
          if (err) {
            db.close();
            return res.status(500).json({ success: false, error: 'Failed to export sales' });
          }
          exportData.sales = sales;
          
          // Get sales items
          db.all('SELECT * FROM sales_items', [], (err, salesItems) => {
            if (err) {
              db.close();
              return res.status(500).json({ success: false, error: 'Failed to export sales items' });
            }
            exportData.sales_items = salesItems;
            
            // Get expenses
            db.all('SELECT * FROM expenses', [], (err, expenses) => {
              if (err) {
                db.close();
                return res.status(500).json({ success: false, error: 'Failed to export expenses' });
              }
              exportData.expenses = expenses;
              
              // Get user activity
              db.all('SELECT * FROM user_activity', [], (err, userActivity) => {
                if (err) {
                  db.close();
                  return res.status(500).json({ success: false, error: 'Failed to export user activity' });
                }
                exportData.user_activity = userActivity;
                
                db.close();
                
                // Create export file with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const exportFileName = `pos_backup_${timestamp}.json`;
                const exportPath = path.join(__dirname, '../../POSBackups', exportFileName);
                
                // Ensure POSBackups directory exists
                const backupDir = path.join(__dirname, '../../POSBackups');
                if (!fs.existsSync(backupDir)) {
                  fs.mkdirSync(backupDir, { recursive: true });
                }
                
                // Write export data to file
                fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
                
                res.json({
                  success: true,
                  message: 'Data exported successfully',
                  filename: exportFileName,
                  data: exportData
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

// Import data
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, error: 'No data provided' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
                 // Clear existing data
         db.run('DELETE FROM sales_items');
         db.run('DELETE FROM sales');
         db.run('DELETE FROM expenses');
         db.run('DELETE FROM user_activity');
         db.run('DELETE FROM stock_items');
        // Note: Don't delete users to preserve current user session
        
        // Import stock items
        if (data.stock_items && Array.isArray(data.stock_items)) {
          const stockStmt = db.prepare(`
            INSERT INTO stock_items (barcode, name, quantity, price, buying_price, expiry_date, reorder_level, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          data.stock_items.forEach(item => {
            stockStmt.run([
              item.barcode,
              item.name,
              item.quantity,
              item.price,
              item.buying_price || item.price,
              item.expiry_date,
              item.reorder_level,
              item.status,
              item.created_at,
              item.updated_at
            ]);
          });
          stockStmt.finalize();
        }
        
        // Import sales
        if (data.sales && Array.isArray(data.sales)) {
          const salesStmt = db.prepare(`
            INSERT INTO sales (invoice_number, total_amount, payment_type, cashier_id, total_profit, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          data.sales.forEach(sale => {
            salesStmt.run([
              sale.invoice_number,
              sale.total_amount,
              sale.payment_type || 'cash',
              sale.cashier_id || null,
              sale.total_profit || 0,
              sale.created_at
            ]);
          });
          salesStmt.finalize();
        }
        
        // Import sales items
        if (data.sales_items && Array.isArray(data.sales_items)) {
          const salesItemsStmt = db.prepare(`
            INSERT INTO sales_items (sale_id, barcode, name, quantity, price, buying_price, expiry_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          data.sales_items.forEach(item => {
            salesItemsStmt.run([
              item.sale_id,
              item.barcode,
              item.name,
              item.quantity,
              item.price,
              item.buying_price || item.price,
              item.expiry_date,
              item.created_at
            ]);
          });
          salesItemsStmt.finalize();
        }
        
        // Import expenses
        if (data.expenses && Array.isArray(data.expenses)) {
          const expensesStmt = db.prepare(`
            INSERT INTO expenses (date, category, amount, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          data.expenses.forEach(expense => {
            expensesStmt.run([
              expense.date,
              expense.category,
              expense.amount,
              expense.notes || '',
              expense.created_by || null,
              expense.created_at
            ]);
          });
          expensesStmt.finalize();
        }
        
        // Import user activity
        if (data.user_activity && Array.isArray(data.user_activity)) {
          const activityStmt = db.prepare(`
            INSERT INTO user_activity (user_id, username, action, details, created_at)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          data.user_activity.forEach(activity => {
            activityStmt.run([
              activity.user_id,
              activity.username,
              activity.action,
              activity.details || '',
              activity.created_at
            ]);
          });
          activityStmt.finalize();
        }
        
        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            db.close();
            return res.status(500).json({ success: false, error: 'Failed to import data' });
          }
          
          db.close();
          res.json({
            success: true,
            message: 'Data imported successfully'
          });
        });
        
      } catch (error) {
        db.run('ROLLBACK');
        db.close();
        throw error;
      }
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: 'Failed to import data' });
  }
});

// Reset system (clear all data except current user)
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const db = new sqlite3.Database(DB_PATH);
    
    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // Clear all data except current user
        db.run('DELETE FROM sales_items');
        db.run('DELETE FROM sales');
        db.run('DELETE FROM expenses');
        db.run('DELETE FROM user_activity');
        db.run('DELETE FROM stock_items');
        
        // Reset auto-increment counters
        db.run('DELETE FROM sqlite_sequence WHERE name IN ("sales", "sales_items", "expenses", "user_activity", "stock_items")');
        
        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            db.close();
            return res.status(500).json({ success: false, error: 'Failed to reset system' });
          }
          
          db.close();
          res.json({
            success: true,
            message: 'System reset successfully'
          });
        });
        
      } catch (error) {
        db.run('ROLLBACK');
        db.close();
        throw error;
      }
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset system' });
  }
});

module.exports = router; 