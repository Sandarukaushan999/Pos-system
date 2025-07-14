const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { db } = require('../models/database');

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, requireAuth, (req, res) => {
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
    
    res.json({
      success: true,
      expenses
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get expenses' 
    });
  }
});

// Get expense by ID
router.get('/:id', authenticateToken, requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = db.prepare(`
      SELECT e.*, u.username as created_by_name 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.id = ?
    `).get(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({
      success: true,
      expense
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get expense' 
    });
  }
});

// Add new expense
router.post('/', authenticateToken, requireAuth, (req, res) => {
  try {
    const { date, category, amount, notes } = req.body;

    if (!date || !category || !amount) {
      return res.status(400).json({ error: 'Date, category, and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const result = db.prepare(`
      INSERT INTO expenses (date, category, amount, notes, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(date, category, amount, notes || null, req.user.id);

    const newExpense = db.prepare(`
      SELECT e.*, u.username as created_by_name 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.json({
      success: true,
      message: 'Expense added successfully',
      expense: newExpense
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to add expense' 
    });
  }
});

// Update expense
router.put('/:id', authenticateToken, requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, amount, notes } = req.body;

    // Check if expense exists
    const existingExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Update expense
    const result = db.prepare(`
      UPDATE expenses 
      SET date = ?, category = ?, amount = ?, notes = ?
      WHERE id = ?
    `).run(
      date || existingExpense.date,
      category || existingExpense.category,
      amount !== undefined ? amount : existingExpense.amount,
      notes !== undefined ? notes : existingExpense.notes,
      id
    );

    const updatedExpense = db.prepare(`
      SELECT e.*, u.username as created_by_name 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.id = ?
    `).get(id);

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update expense' 
    });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete expense' 
    });
  }
});

// Get expense categories
router.get('/categories/list', authenticateToken, requireAuth, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count, SUM(amount) as total
      FROM expenses 
      GROUP BY category 
      ORDER BY total DESC
    `).all();
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get expense categories' 
    });
  }
});

// Get expense statistics
router.get('/stats/overview', authenticateToken, requireAuth, (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    const params = [];

    switch (period) {
      case 'today':
        dateFilter = 'AND date = DATE("now")';
        break;
      case 'week':
        dateFilter = 'AND date >= DATE("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'AND date >= DATE("now", "-30 days")';
        break;
      case 'year':
        dateFilter = 'AND date >= DATE("now", "-365 days")';
        break;
    }

    const totalExpenses = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total 
      FROM expenses 
      WHERE 1=1 ${dateFilter}
    `).get(...params);

    const expensesByCategory = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(amount) as total
      FROM expenses 
      WHERE 1=1 ${dateFilter}
      GROUP BY category
      ORDER BY total DESC
    `).all(...params);

    const dailyExpenses = db.prepare(`
      SELECT date, COUNT(*) as count, SUM(amount) as total
      FROM expenses 
      WHERE 1=1 ${dateFilter}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `).all(...params);

    res.json({
      success: true,
      stats: {
        totalExpenses: totalExpenses.count || 0,
        totalAmount: totalExpenses.total || 0,
        expensesByCategory,
        dailyExpenses
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get expense statistics' 
    });
  }
});

module.exports = router; 