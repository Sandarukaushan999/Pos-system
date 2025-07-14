const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, '..', 'database.db');

// Function to get a new database connection
function getDb() {
  return new sqlite3.Database(dbPath);
}

// Initialize database: create tables, default admin, and sample data
async function initializeDatabase() {
  const db = getDb();
  await runAsync(db, 'PRAGMA foreign_keys = ON');
  await createTables(db);
  await createDefaultAdmin(db);
  await insertSampleData(db);
  db.close();
  console.log('✅ Database initialized successfully');
}

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function createTables(db) {
  // Users table
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stock items table
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      expiry_date DATE,
      status TEXT NOT NULL DEFAULT 'pending',
      reorder_level INTEGER NOT NULL DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL DEFAULT 'cash',
      cashier_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cashier_id) REFERENCES users (id)
    )
  `);

  // Sales items table
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS sales_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      expiry_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
    )
  `);

  // Expenses table
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Create indexes for better performance
  await runAsync(db, 'CREATE INDEX IF NOT EXISTS idx_stock_barcode ON stock_items(barcode)');
  await runAsync(db, 'CREATE INDEX IF NOT EXISTS idx_stock_status ON stock_items(status)');
  await runAsync(db, 'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)');
  await runAsync(db, 'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
}

async function createDefaultAdmin(db) {
  const adminExists = await getAsync(db, 'SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    await runAsync(db, `
      INSERT INTO users (username, password_hash, role) 
      VALUES (?, ?, ?)
    `, ['admin', passwordHash, 'admin']);
    console.log('✅ Default admin user created (username: admin, password: admin123)');
  }
}

async function insertSampleData(db) {
  const stockCount = await getAsync(db, 'SELECT COUNT(*) as count FROM stock_items');
  if (stockCount.count === 0) {
    const sampleItems = [
      {
        barcode: '1234567890123',
        name: 'Sample Product 1',
        quantity: 50,
        price: 9.99,
        expiry_date: '2024-12-31',
        status: 'active',
        reorder_level: 10
      },
      {
        barcode: '9876543210987',
        name: 'Sample Product 2',
        quantity: 25,
        price: 15.50,
        expiry_date: '2024-06-30',
        status: 'active',
        reorder_level: 5
      }
    ];
    for (const item of sampleItems) {
      await runAsync(db, `
        INSERT INTO stock_items (barcode, name, quantity, price, expiry_date, status, reorder_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        item.barcode,
        item.name,
        item.quantity,
        item.price,
        item.expiry_date,
        item.status,
        item.reorder_level
      ]);
    }
    console.log('✅ Sample data inserted');
  }
}

module.exports = {
  getDb,
  initializeDatabase,
  runAsync,
  getAsync,
  allAsync
}; 