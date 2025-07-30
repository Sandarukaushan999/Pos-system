const express = require('express');
const { authenticateToken, requireAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../models/database');

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.all('SELECT e.*, u.username as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id ORDER BY e.date DESC, e.created_at DESC', [], (err, expenses) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch expenses' });
    res.json({ success: true, expenses });
  });
});

// Add new expense
router.post('/', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { date, category, amount, notes } = req.body;
  if (!date || !category || !amount) return res.status(400).json({ error: 'Date, category, and amount are required' });
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
  db.run('INSERT INTO expenses (date, category, amount, notes, created_by) VALUES (?, ?, ?, ?, ?)', [date, category, amount, notes || null, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to add expense' });
    db.get('SELECT e.*, u.username as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ?', [this.lastID], (err2, expense) => {
      // Trigger dashboard refresh by adding a timestamp
      const refreshData = {
        timestamp: Date.now(),
        expenseId: this.lastID,
        amount: amount,
        type: 'expense'
      };
      
      res.json({ 
        success: true, 
        message: 'Expense added successfully', 
        expense,
        dashboardRefresh: refreshData
      });
    });
  });
});

// Update expense (admin or creator)
router.put('/:id', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { date, category, amount, notes } = req.body;
  db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, expense) => {
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (req.user.role !== 'admin' && expense.created_by !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.run('UPDATE expenses SET date = ?, category = ?, amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [date || expense.date, category || expense.category, amount !== undefined ? amount : expense.amount, notes || expense.notes, id], function(err2) {
      if (err2) return res.status(500).json({ error: 'Failed to update expense' });
      db.get('SELECT * FROM expenses WHERE id = ?', [id], (err3, updated) => {
        res.json({ success: true, message: 'Expense updated successfully', expense: updated });
      });
    });
  });
});

// Delete expense (admin or creator)
router.delete('/:id', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  db.get('SELECT * FROM expenses WHERE id = ?', [id], (err, expense) => {
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    if (req.user.role !== 'admin' && expense.created_by !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.run('DELETE FROM expenses WHERE id = ?', [id], function(err2) {
      if (err2) return res.status(500).json({ error: 'Failed to delete expense' });
      res.json({ success: true, message: 'Expense deleted successfully' });
    });
  });
});

// Get expense stats
router.get('/stats', authenticateToken, requireAuth, (req, res) => {
  const db = getDb();
  db.get('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses', [], (err, stats) => {
    if (err) return res.status(500).json({ error: 'Failed to get expense stats' });
    res.json({ success: true, stats });
  });
});

module.exports = router; 