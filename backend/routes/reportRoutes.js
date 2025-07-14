const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { db } = require('../models/database');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const router = express.Router();

// Ensure backup directory exists
const ensureBackupDir = () => {
  const backupPath = path.join(__dirname, '..', '..', 'POSBackups');
  const yearPath = path.join(backupPath, moment().format('YYYY'));
  const monthPath = path.join(yearPath, moment().format('MM'));
  
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath);
  if (!fs.existsSync(yearPath)) fs.mkdirSync(yearPath);
  if (!fs.existsSync(monthPath)) fs.mkdirSync(monthPath);
  
  return monthPath;
};

// Generate sales report Excel
router.get('/sales/excel', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
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

    query += ' ORDER BY s.created_at DESC';

    const sales = db.prepare(query).all(...params);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add headers
    worksheet.columns = [
      { header: 'Invoice #', key: 'invoice_number', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Cashier', key: 'cashier_name', width: 15 },
      { header: 'Payment Type', key: 'payment_type', width: 15 },
      { header: 'Total Amount', key: 'total_amount', width: 15 }
    ];

    // Add data
    sales.forEach(sale => {
      const saleDate = moment(sale.created_at);
      worksheet.addRow({
        invoice_number: sale.invoice_number,
        date: saleDate.format('YYYY-MM-DD'),
        time: saleDate.format('HH:mm:ss'),
        cashier_name: sale.cashier_name || 'Unknown',
        payment_type: sale.payment_type,
        total_amount: sale.total_amount
      });
    });

    // Add summary
    const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    worksheet.addRow([]);
    worksheet.addRow(['Total Sales:', sales.length]);
    worksheet.addRow(['Total Amount:', totalAmount]);

    // Style the summary
    const summaryRow = worksheet.getRow(worksheet.rowCount - 1);
    summaryRow.font = { bold: true };
    summaryRow.getCell(2).numFmt = '$#,##0.00';

    // Save file
    const backupDir = ensureBackupDir();
    const fileName = `sales_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const filePath = path.join(backupDir, fileName);
    
    await workbook.xlsx.writeFile(filePath);

    res.json({
      success: true,
      message: 'Sales report generated successfully',
      filePath: filePath.replace(/\\/g, '/'),
      fileName
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate sales report' 
    });
  }
});

// Generate inventory report Excel
router.get('/inventory/excel', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM stock_items WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY name ASC';

    const items = db.prepare(query).all(...params);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Report');

    // Add headers
    worksheet.columns = [
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Total Value', key: 'total_value', width: 15 },
      { header: 'Reorder Level', key: 'reorder_level', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
      { header: 'Last Updated', key: 'updated_at', width: 20 }
    ];

    // Add data
    items.forEach(item => {
      const totalValue = item.quantity * item.price;
      const isLowStock = item.quantity <= item.reorder_level;
      const isExpired = item.expiry_date && moment(item.expiry_date).isBefore(moment(), 'day');
      
      const row = worksheet.addRow({
        barcode: item.barcode,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total_value: totalValue,
        reorder_level: item.reorder_level,
        status: item.status,
        expiry_date: item.expiry_date || 'N/A',
        updated_at: moment(item.updated_at).format('YYYY-MM-DD HH:mm')
      });

      // Highlight low stock and expired items
      if (isLowStock) {
        row.getCell('quantity').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      }
      if (isExpired) {
        row.getCell('expiry_date').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      }
    });

    // Add summary
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const lowStockCount = items.filter(item => item.quantity <= item.reorder_level).length;
    const expiredCount = items.filter(item => item.expiry_date && moment(item.expiry_date).isBefore(moment(), 'day')).length;

    worksheet.addRow([]);
    worksheet.addRow(['Total Items:', totalItems]);
    worksheet.addRow(['Total Value:', totalValue]);
    worksheet.addRow(['Low Stock Items:', lowStockCount]);
    worksheet.addRow(['Expired Items:', expiredCount]);

    // Style the summary
    for (let i = worksheet.rowCount - 4; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.font = { bold: true };
      if (i === worksheet.rowCount - 3) {
        row.getCell(2).numFmt = '$#,##0.00';
      }
    }

    // Save file
    const backupDir = ensureBackupDir();
    const fileName = `inventory_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const filePath = path.join(backupDir, fileName);
    
    await workbook.xlsx.writeFile(filePath);

    res.json({
      success: true,
      message: 'Inventory report generated successfully',
      filePath: filePath.replace(/\\/g, '/'),
      fileName
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate inventory report' 
    });
  }
});

// Generate expenses report Excel
router.get('/expenses/excel', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, category } = req.query;
    
    let query = `
      SELECT e.*, u.username as created_by_name 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND e.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND e.date <= ?';
      params.push(end_date);
    }

    if (category) {
      query += ' AND e.category = ?';
      params.push(category);
    }

    query += ' ORDER BY e.date DESC';

    const expenses = db.prepare(query).all(...params);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expenses Report');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created By', key: 'created_by_name', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];

    // Add data
    expenses.forEach(expense => {
      worksheet.addRow({
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        notes: expense.notes || 'N/A',
        created_by_name: expense.created_by_name || 'Unknown',
        created_at: moment(expense.created_at).format('YYYY-MM-DD HH:mm')
      });
    });

    // Add summary
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Group by category
    const categoryTotals = {};
    expenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;
    });

    worksheet.addRow([]);
    worksheet.addRow(['Total Expenses:', totalExpenses]);
    worksheet.addRow(['Total Amount:', totalAmount]);
    worksheet.addRow([]);
    worksheet.addRow(['Category Breakdown:']);

    Object.entries(categoryTotals).forEach(([category, amount]) => {
      worksheet.addRow([category, amount]);
    });

    // Style the summary
    const summaryStartRow = worksheet.rowCount - Object.keys(categoryTotals).length - 3;
    for (let i = summaryStartRow; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.font = { bold: true };
      if (i === summaryStartRow + 1) {
        row.getCell(2).numFmt = '$#,##0.00';
      }
    }

    // Save file
    const backupDir = ensureBackupDir();
    const fileName = `expenses_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const filePath = path.join(backupDir, fileName);
    
    await workbook.xlsx.writeFile(filePath);

    res.json({
      success: true,
      message: 'Expenses report generated successfully',
      filePath: filePath.replace(/\\/g, '/'),
      fileName
    });
  } catch (error) {
    console.error('Error generating expenses report:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate expenses report' 
    });
  }
});

// Generate comprehensive business report
router.get('/business/excel', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Get sales data
    let salesQuery = `
      SELECT s.*, u.username as cashier_name 
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      salesQuery += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      salesQuery += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    const sales = db.prepare(salesQuery).all(...params);

    // Get expenses data
    let expensesQuery = `
      SELECT e.*, u.username as created_by_name 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE 1=1
    `;

    if (start_date) {
      expensesQuery += ' AND e.date >= ?';
    }

    if (end_date) {
      expensesQuery += ' AND e.date <= ?';
    }

    const expenses = db.prepare(expensesQuery).all(...params);

    // Get inventory data
    const inventory = db.prepare('SELECT * FROM stock_items WHERE status = "active"').all();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Sales Summary Sheet
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

    // Expenses Summary Sheet
    const expensesSheet = workbook.addWorksheet('Expenses Summary');
    expensesSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Created By', key: 'created_by_name', width: 15 }
    ];

    expenses.forEach(expense => {
      expensesSheet.addRow({
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        notes: expense.notes || 'N/A',
        created_by_name: expense.created_by_name || 'Unknown'
      });
    });

    // Business Summary Sheet
    const summarySheet = workbook.addWorksheet('Business Summary');
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const profit = totalSales - totalExpenses;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    summarySheet.addRow(['BUSINESS SUMMARY REPORT']);
    summarySheet.addRow(['Generated:', moment().format('YYYY-MM-DD HH:mm:ss')]);
    summarySheet.addRow([]);
    summarySheet.addRow(['PERIOD:', start_date || 'All Time', 'TO:', end_date || 'Current']);
    summarySheet.addRow([]);
    summarySheet.addRow(['SALES SUMMARY']);
    summarySheet.addRow(['Total Sales:', sales.length]);
    summarySheet.addRow(['Total Revenue:', totalSales]);
    summarySheet.addRow([]);
    summarySheet.addRow(['EXPENSES SUMMARY']);
    summarySheet.addRow(['Total Expenses:', expenses.length]);
    summarySheet.addRow(['Total Expenses Amount:', totalExpenses]);
    summarySheet.addRow([]);
    summarySheet.addRow(['PROFIT ANALYSIS']);
    summarySheet.addRow(['Gross Profit:', profit]);
    summarySheet.addRow(['Profit Margin:', totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) + '%' : '0%']);
    summarySheet.addRow([]);
    summarySheet.addRow(['INVENTORY SUMMARY']);
    summarySheet.addRow(['Total Items:', inventory.length]);
    summarySheet.addRow(['Total Inventory Value:', totalInventoryValue]);
    summarySheet.addRow(['Low Stock Items:', inventory.filter(item => item.quantity <= item.reorder_level).length]);
    summarySheet.addRow(['Expired Items:', inventory.filter(item => item.expiry_date && moment(item.expiry_date).isBefore(moment(), 'day')).length]);

    // Style summary sheet
    summarySheet.getRow(1).font = { bold: true, size: 16 };
    summarySheet.getRow(4).font = { bold: true };
    summarySheet.getRow(7).font = { bold: true };
    summarySheet.getRow(11).font = { bold: true };
    summarySheet.getRow(15).font = { bold: true };
    summarySheet.getRow(20).font = { bold: true };

    // Save file
    const backupDir = ensureBackupDir();
    const fileName = `business_report_${moment().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
    const filePath = path.join(backupDir, fileName);
    
    await workbook.xlsx.writeFile(filePath);

    res.json({
      success: true,
      message: 'Business report generated successfully',
      filePath: filePath.replace(/\\/g, '/'),
      fileName,
      summary: {
        totalSales: sales.length,
        totalRevenue: totalSales,
        totalExpenses: expenses.length,
        totalExpensesAmount: totalExpenses,
        profit: profit,
        profitMargin: totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) : '0',
        totalInventoryValue: totalInventoryValue
      }
    });
  } catch (error) {
    console.error('Error generating business report:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate business report' 
    });
  }
});

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireAuth, (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const thisMonth = moment().format('YYYY-MM');

    // Today's sales
    const todaySales = db.prepare(`
      SELECT COUNT(*) as count, SUM(total_amount) as total 
      FROM sales 
      WHERE DATE(created_at) = ?
    `).get(today);

    // This month's sales
    const monthSales = db.prepare(`
      SELECT COUNT(*) as count, SUM(total_amount) as total 
      FROM sales 
      WHERE strftime('%Y-%m', created_at) = ?
    `).get(thisMonth);

    // Today's expenses
    const todayExpenses = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total 
      FROM expenses 
      WHERE date = ?
    `).get(today);

    // This month's expenses
    const monthExpenses = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total 
      FROM expenses 
      WHERE strftime('%Y-%m', date) = ?
    `).get(thisMonth);

    // Inventory alerts
    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM stock_items 
      WHERE status = 'active' AND quantity <= reorder_level
    `).get();

    const expiredCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM stock_items 
      WHERE status = 'active' AND expiry_date < ?
    `).get(today);

    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM stock_items 
      WHERE status = 'pending'
    `).get();

    // Recent sales (last 10)
    const recentSales = db.prepare(`
      SELECT s.*, u.username as cashier_name 
      FROM sales s 
      LEFT JOIN users u ON s.cashier_id = u.id 
      ORDER BY s.created_at DESC 
      LIMIT 10
    `).all();

    // Top selling items (this month)
    const topItems = db.prepare(`
      SELECT 
        si.name,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.price) as total_revenue
      FROM sales_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE strftime('%Y-%m', s.created_at) = ?
      GROUP BY si.barcode, si.name
      ORDER BY total_quantity DESC
      LIMIT 5
    `).all(thisMonth);

    res.json({
      success: true,
      dashboard: {
        today: {
          sales: todaySales.count || 0,
          revenue: todaySales.total || 0,
          expenses: todayExpenses.count || 0,
          expensesAmount: todayExpenses.total || 0
        },
        month: {
          sales: monthSales.count || 0,
          revenue: monthSales.total || 0,
          expenses: monthExpenses.count || 0,
          expensesAmount: monthExpenses.total || 0
        },
        alerts: {
          lowStock: lowStockCount.count || 0,
          expired: expiredCount.count || 0,
          pending: pendingCount.count || 0
        },
        recentSales,
        topItems
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get dashboard data' 
    });
  }
});

module.exports = router; 