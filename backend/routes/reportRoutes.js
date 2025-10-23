const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { getDb } = require('../models/database');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const router = express.Router();

// Ensure backup directory exists
function ensureBackupDir() {
  const backupPath = path.join(__dirname, '../../POSBackups');
  const yearPath = path.join(backupPath, moment().format('YYYY'));
  const monthPath = path.join(yearPath, moment().format('MM'));
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath);
  if (!fs.existsSync(yearPath)) fs.mkdirSync(yearPath);
  if (!fs.existsSync(monthPath)) fs.mkdirSync(monthPath);
  return monthPath;
}

// Dashboard stats
router.get('/dashboard', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const today = moment().format('YYYY-MM-DD');
  const thisMonth = moment().format('YYYY-MM');
  console.log('Dashboard request - Today:', today, 'This Month:', thisMonth);
  
  const stats = {};
  db.get('SELECT COUNT(*) as count, SUM(total_amount) as total, SUM(total_profit) as profit FROM sales WHERE DATE(created_at) = ?', [today], (err, todaySales) => {
    console.log('Today sales query result:', todaySales);
    db.get('SELECT COUNT(*) as count, SUM(total_amount) as total, SUM(total_profit) as profit FROM sales WHERE strftime("%Y-%m", created_at) = ?', [thisMonth], (err2, monthSales) => {
      console.log('Month sales query result:', monthSales);
      db.get('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses WHERE date = ?', [today], (err3, todayExpenses) => {
        console.log('Today expenses query result:', todayExpenses);
        db.get('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses WHERE strftime("%Y-%m", date) = ?', [thisMonth], (err4, monthExpenses) => {
          console.log('Month expenses query result:', monthExpenses);
          db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "active" AND quantity <= reorder_level', [], (err5, lowStock) => {
            db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "active" AND expiry_date < ?', [today], (err6, expired) => {
              db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "pending"', [], (err7, pending) => {
                db.all('SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id ORDER BY s.created_at DESC LIMIT 10', [], (err8, recentSales) => {
                  db.all('SELECT si.name, SUM(si.quantity) as total_quantity, SUM(si.quantity * si.price) as total_revenue FROM sales_items si JOIN sales s ON si.sale_id = s.id WHERE strftime("%Y-%m", s.created_at) = ? GROUP BY si.barcode, si.name ORDER BY total_quantity DESC LIMIT 5', [thisMonth], (err9, topItems) => {
                    db.get('SELECT COUNT(*) as count FROM stock_items WHERE status = "active"', [], (err10, totalItems) => {
                      db.get('SELECT COUNT(*) as count FROM users', [], (err11, totalUsers) => {
                        db.all('SELECT payment_type, COUNT(*) as count, SUM(total_amount) as total FROM sales WHERE strftime("%Y-%m", created_at) = ? GROUP BY payment_type', [thisMonth], (err12, salesByPayment) => {
                          // Get daily sales for the current month with proper date formatting
                          db.all('SELECT DATE(created_at) as date, SUM(total_amount) as total FROM sales WHERE strftime("%Y-%m", created_at) = ? GROUP BY DATE(created_at) ORDER BY date ASC', [thisMonth], (err13, dailySales) => {
                            console.log('Daily sales query result:', dailySales);
                            
                            // Process daily sales data to ensure proper formatting
                            const processedDailySales = dailySales.map(sale => ({
                              date: moment(sale.date).format('MMM DD'),
                              total: sale.total || 0
                            }));
                            
                            const dashboardData = {
                              today: {
                                sales: todaySales?.count || 0,
                                revenue: todaySales?.total || 0,
                                profit: todaySales?.profit || 0,
                                expenses: todayExpenses?.count || 0,
                                expensesAmount: todayExpenses?.total || 0
                              },
                              month: {
                                sales: monthSales?.count || 0,
                                revenue: monthSales?.total || 0,
                                profit: monthSales?.profit || 0,
                                expenses: monthExpenses?.count || 0,
                                expensesAmount: monthExpenses?.total || 0,
                                totalItems: totalItems?.count || 0,
                                totalUsers: totalUsers?.count || 0,
                                salesByPayment: salesByPayment || [],
                                dailySales: processedDailySales || []
                              },
                              alerts: {
                                lowStock: lowStock?.count || 0,
                                expired: expired?.count || 0,
                                pending: pending?.count || 0
                              },
                              recentSales: recentSales || [],
                              topItems: topItems || []
                            };
                            console.log('Dashboard data being sent:', dashboardData);
                            res.json({
                              success: true,
                              dashboard: dashboardData
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

// Excel export helpers
async function exportToExcel(type, data, fileName, columns, summaryRows = []) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);
  worksheet.columns = columns;
  data.forEach(row => worksheet.addRow(row));
  summaryRows.forEach(row => worksheet.addRow(row));
  const backupDir = ensureBackupDir();
  const filePath = path.join(backupDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return { filePath: filePath.replace(/\\/g, '/'), fileName };
}

// Sales report
router.get('/sales/excel', authenticateToken, requireAuth, async (req, res) => {
  const db = getDb();
  const { start_date, end_date, period } = req.query;
  
  // Build date filter based on parameters
  let dateFilter = '';
  let queryParams = [];
  
  if (start_date && end_date) {
    dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
    queryParams = [start_date, end_date];
  } else if (period) {
    const today = moment();
    switch (period) {
      case 'today':
        dateFilter = 'WHERE DATE(s.created_at) = ?';
        queryParams = [today.format('YYYY-MM-DD')];
        break;
      case 'week':
        const weekStart = today.startOf('week').format('YYYY-MM-DD');
        const weekEnd = today.endOf('week').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        queryParams = [weekStart, weekEnd];
        break;
      case 'month':
        const monthStart = today.startOf('month').format('YYYY-MM-DD');
        const monthEnd = today.endOf('month').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        queryParams = [monthStart, monthEnd];
        break;
      case 'year':
        const yearStart = today.startOf('year').format('YYYY-MM-DD');
        const yearEnd = today.endOf('year').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        queryParams = [yearStart, yearEnd];
        break;
    }
  }
  
  const query = `SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id ${dateFilter} ORDER BY s.created_at DESC`;
  console.log('Sales report query:', query, 'Params:', queryParams);
  
  db.all(query, queryParams, async (err, sales) => {
    if (err) return res.status(500).json({ error: 'Failed to get sales' });
    const columns = [
      { header: 'Invoice #', key: 'invoice_number', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Cashier', key: 'cashier_name', width: 15 },
      { header: 'Payment Type', key: 'payment_type', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 }
    ];
    const rows = sales.map(sale => ({
      invoice_number: sale.invoice_number,
      date: moment(sale.created_at).format('YYYY-MM-DD'),
      time: moment(sale.created_at).format('HH:mm:ss'),
      cashier_name: sale.cashier_name || 'Unknown',
      payment_type: sale.payment_type,
      total_amount: sale.total_amount
    }));
    const totalAmount = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const summaryRows = [[], ['Total Sales:', sales.length], ['Total Amount:', totalAmount]];
    const fileName = `sales_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const fileInfo = await exportToExcel('Sales Report', rows, fileName, columns, summaryRows);
    res.json({ success: true, message: 'Sales report generated', ...fileInfo });
  });
});

// Inventory report
router.get('/inventory/excel', authenticateToken, requireAuth, async (req, res) => {
  const db = getDb();
  const { start_date, end_date, period } = req.query;
  
  // Build date filter based on parameters (for inventory, we filter by created_at or updated_at)
  let dateFilter = '';
  let queryParams = [];
  
  if (start_date && end_date) {
    dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ? OR DATE(updated_at) BETWEEN ? AND ?';
    queryParams = [start_date, end_date, start_date, end_date];
  } else if (period) {
    const today = moment();
    switch (period) {
      case 'today':
        dateFilter = 'WHERE DATE(created_at) = ? OR DATE(updated_at) = ?';
        const todayStr = today.format('YYYY-MM-DD');
        queryParams = [todayStr, todayStr];
        break;
      case 'week':
        const weekStart = today.startOf('week').format('YYYY-MM-DD');
        const weekEnd = today.endOf('week').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ? OR DATE(updated_at) BETWEEN ? AND ?';
        queryParams = [weekStart, weekEnd, weekStart, weekEnd];
        break;
      case 'month':
        const monthStart = today.startOf('month').format('YYYY-MM-DD');
        const monthEnd = today.endOf('month').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ? OR DATE(updated_at) BETWEEN ? AND ?';
        queryParams = [monthStart, monthEnd, monthStart, monthEnd];
        break;
      case 'year':
        const yearStart = today.startOf('year').format('YYYY-MM-DD');
        const yearEnd = today.endOf('year').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ? OR DATE(updated_at) BETWEEN ? AND ?';
        queryParams = [yearStart, yearEnd, yearStart, yearEnd];
        break;
    }
  }
  
  const query = `SELECT * FROM stock_items ${dateFilter} ORDER BY created_at DESC`;
  console.log('Inventory report query:', query, 'Params:', queryParams);
  
  db.all(query, queryParams, async (err, items) => {
    if (err) return res.status(500).json({ error: 'Failed to get inventory' });
    const columns = [
      { header: 'Barcode', key: 'barcode', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 10 },
      { header: 'Total Value', key: 'total_value', width: 15 },
      { header: 'Reorder Level', key: 'reorder_level', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];
    const rows = items.map(item => ({
      ...item,
      total_value: item.quantity * item.price,
      updated_at: moment(item.updated_at).format('YYYY-MM-DD HH:mm')
    }));
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const summaryRows = [[], ['Total Items:', items.length], ['Total Value:', totalValue]];
    const fileName = `inventory_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const fileInfo = await exportToExcel('Inventory Report', rows, fileName, columns, summaryRows);
    res.json({ success: true, message: 'Inventory report generated', ...fileInfo });
  });
});

// Expenses report
router.get('/expenses/excel', authenticateToken, requireAuth, async (req, res) => {
  const db = getDb();
  const { start_date, end_date, period } = req.query;
  
  // Build date filter based on parameters
  let dateFilter = '';
  let queryParams = [];
  
  if (start_date && end_date) {
    dateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
    queryParams = [start_date, end_date];
  } else if (period) {
    const today = moment();
    switch (period) {
      case 'today':
        dateFilter = 'WHERE DATE(e.date) = ?';
        queryParams = [today.format('YYYY-MM-DD')];
        break;
      case 'week':
        const weekStart = today.startOf('week').format('YYYY-MM-DD');
        const weekEnd = today.endOf('week').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
        queryParams = [weekStart, weekEnd];
        break;
      case 'month':
        const monthStart = today.startOf('month').format('YYYY-MM-DD');
        const monthEnd = today.endOf('month').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
        queryParams = [monthStart, monthEnd];
        break;
      case 'year':
        const yearStart = today.startOf('year').format('YYYY-MM-DD');
        const yearEnd = today.endOf('year').format('YYYY-MM-DD');
        dateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
        queryParams = [yearStart, yearEnd];
        break;
    }
  }
  
  const query = `SELECT e.*, u.username as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id ${dateFilter} ORDER BY e.date DESC`;
  console.log('Expenses report query:', query, 'Params:', queryParams);
  
  db.all(query, queryParams, async (err, expenses) => {
    if (err) return res.status(500).json({ error: 'Failed to get expenses' });
    const columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created By', key: 'created_by_name', width: 15 }
    ];
    const rows = expenses.map(exp => ({
      ...exp,
      notes: exp.notes || 'N/A',
      created_by_name: exp.created_by_name || 'Unknown'
    }));
    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const summaryRows = [[], ['Total Expenses:', expenses.length], ['Total Amount:', totalAmount]];
    const fileName = `expenses_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const fileInfo = await exportToExcel('Expenses Report', rows, fileName, columns, summaryRows);
    res.json({ success: true, message: 'Expenses report generated', ...fileInfo });
  });
});

// Business summary report
router.get('/business/excel', authenticateToken, requireAuth, async (req, res) => {
  const db = getDb();
  const { start_date, end_date, period } = req.query;
  
  // Build date filter based on parameters
  let salesDateFilter = '';
  let expensesDateFilter = '';
  let salesQueryParams = [];
  let expensesQueryParams = [];
  
  if (start_date && end_date) {
    salesDateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
    expensesDateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
    salesQueryParams = [start_date, end_date];
    expensesQueryParams = [start_date, end_date];
  } else if (period) {
    const today = moment();
    switch (period) {
      case 'today':
        salesDateFilter = 'WHERE DATE(s.created_at) = ?';
        expensesDateFilter = 'WHERE DATE(e.date) = ?';
        const todayStr = today.format('YYYY-MM-DD');
        salesQueryParams = [todayStr];
        expensesQueryParams = [todayStr];
        break;
      case 'week':
        const weekStart = today.startOf('week').format('YYYY-MM-DD');
        const weekEnd = today.endOf('week').format('YYYY-MM-DD');
        salesDateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        expensesDateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
        salesQueryParams = [weekStart, weekEnd];
        expensesQueryParams = [weekStart, weekEnd];
        break;
      case 'month':
        const monthStart = today.startOf('month').format('YYYY-MM-DD');
        const monthEnd = today.endOf('month').format('YYYY-MM-DD');
        salesDateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        expensesDateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
        salesQueryParams = [monthStart, monthEnd];
        expensesQueryParams = [monthStart, monthEnd];
        break;
      case 'year':
        const yearStart = today.startOf('year').format('YYYY-MM-DD');
        const yearEnd = today.endOf('year').format('YYYY-MM-DD');
        salesDateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
        expensesDateFilter = 'WHERE DATE(e.date) BETWEEN ? AND ?';
        salesQueryParams = [yearStart, yearEnd];
        expensesQueryParams = [yearStart, yearEnd];
        break;
    }
  }
  
  const salesQuery = `SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id ${salesDateFilter} ORDER BY s.created_at DESC`;
  const expensesQuery = `SELECT e.*, u.username as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id ${expensesDateFilter} ORDER BY e.date DESC`;
  
  console.log('Business report sales query:', salesQuery, 'Params:', salesQueryParams);
  console.log('Business report expenses query:', expensesQuery, 'Params:', expensesQueryParams);
  
  db.all(salesQuery, salesQueryParams, async (err, sales) => {
    db.all(expensesQuery, expensesQueryParams, async (err2, expenses) => {
      db.all('SELECT * FROM stock_items WHERE status = "active"', [], async (err3, inventory) => {
        const workbook = new ExcelJS.Workbook();
        // Sales Summary
        const salesSheet = workbook.addWorksheet('Sales Summary');
        salesSheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Invoice #', key: 'invoice_number', width: 15 },
          { header: 'Cashier', key: 'cashier_name', width: 15 },
          { header: 'Payment Type', key: 'payment_type', width: 15 },
          { header: 'Amount', key: 'total_amount', width: 15 }
        ];
        sales.forEach(sale => {
          salesSheet.addRow({
            date: moment(sale.created_at).format('YYYY-MM-DD'),
            invoice_number: sale.invoice_number,
            cashier_name: sale.cashier_name || 'Unknown',
            payment_type: sale.payment_type,
            total_amount: sale.total_amount
          });
        });
        // Expenses Summary
        const expensesSheet = workbook.addWorksheet('Expenses Summary');
        expensesSheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Notes', key: 'notes', width: 30 },
          { header: 'Created By', key: 'created_by_name', width: 15 }
        ];
        expenses.forEach(exp => {
          expensesSheet.addRow({
            date: exp.date,
            category: exp.category,
            amount: exp.amount,
            notes: exp.notes || 'N/A',
            created_by_name: exp.created_by_name || 'Unknown'
          });
        });
        // Business Summary
        const summarySheet = workbook.addWorksheet('Business Summary');
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const profit = totalSales - totalExpenses;
        const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        summarySheet.addRow(['BUSINESS SUMMARY REPORT']);
        summarySheet.addRow(['Generated:', moment().format('YYYY-MM-DD HH:mm:ss')]);
        summarySheet.addRow([]);
        summarySheet.addRow(['Total Sales:', sales.length]);
        summarySheet.addRow(['Total Revenue:', totalSales]);
        summarySheet.addRow(['Total Expenses:', expenses.length]);
        summarySheet.addRow(['Total Expense Amount:', totalExpenses]);
        summarySheet.addRow(['Profit:', profit]);
        summarySheet.addRow(['Total Inventory Value:', totalInventoryValue]);
        const backupDir = ensureBackupDir();
        const fileName = `business_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
        const filePath = path.join(backupDir, fileName);
        await workbook.xlsx.writeFile(filePath);
        res.json({ success: true, message: 'Business report generated', filePath: filePath.replace(/\\/g, '/'), fileName });
      });
    });
  });
});

// Download Excel file by filename (search all subfolders)
router.get('/download/:type/:fileName', authenticateToken, requireAuth, (req, res) => {
  const { fileName } = req.params;
  const backupRoot = path.join(__dirname, '../../POSBackups');
  let allFiles = [];

  function findFile(dir, target) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        const found = findFile(fullPath, target);
        if (found) return found;
      } else {
        allFiles.push(fullPath);
        if (file === target) {
          return fullPath;
        }
      }
    }
    return null;
  }

  const filePath = findFile(backupRoot, fileName);
  console.log('Download requested for:', fileName);
  console.log('All files found:', allFiles);
  if (!filePath) {
    console.log('File not found:', fileName);
    return res.status(404).json({ error: 'File not found', searched: allFiles });
  }
  console.log('File found at:', filePath);
  res.download(filePath, fileName);
});

module.exports = router; 