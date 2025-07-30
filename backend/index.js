require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initializeDatabase, getDb } = require('./models/database');
const { hashPassword } = require('./middleware/auth');

const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const salesRoutes = require('./routes/salesRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Initialize DB
initializeDatabase();

// Always ensure default users exist
(async () => {
  const db = getDb();
  // Admin
  db.get('SELECT * FROM users WHERE username = ?', ['Admin'], async (err, user) => {
    if (!user) {
      const hash = await hashPassword('Admin123');
      db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['Admin', hash, 'admin'], function(err2) {
        if (!err2) {
          console.log('Default admin user created: Admin / Admin123');
        }
      });
    }
  });
  // Salesman
  db.get('SELECT * FROM users WHERE username = ?', ['salesman'], async (err, user) => {
    const hash = await hashPassword('salesman123');
    if (!user) {
      db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['salesman', hash, 'salesman'], function(err2) {
        if (!err2) {
          console.log('Default salesman user created: salesman / salesman123');
        }
      });
    } else {
      db.run('UPDATE users SET password_hash = ?, role = ? WHERE username = ?', [hash, 'salesman', 'salesman'], function(err2) {
        if (!err2) {
          console.log('Salesman user password reset to salesman123 and role set to salesman');
        }
      });
    }
  });
  // Data Entry
  db.get('SELECT * FROM users WHERE username = ?', ['dataenter'], async (err, user) => {
    if (!user) {
      const hash = await hashPassword('dataenter123');
      db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['dataenter', hash, 'dataentry'], function(err2) {
        if (!err2) {
          console.log('Default dataentry user created: dataenter / dataenter123');
        }
      });
    }
  });
})();

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Backend is running' }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`POS backend running on port ${PORT}`);
}); 