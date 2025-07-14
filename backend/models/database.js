const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

const initializeDatabase = () => {
  try {
    // Create tables
    createTables();
    
    // Insert default admin user
    createDefaultAdmin();
    
    // Insert sample data for testing
    insertSampleData();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const createTables = () => {
  // Users table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec('CREATE INDEX IF NOT EXISTS idx_stock_barcode ON stock_items(barcode)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_stock_status ON stock_items(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
};

const createDefaultAdmin = () => {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, role) 
      VALUES (?, ?, ?)
    `).run('admin', passwordHash, 'admin');
    
    console.log('✅ Default admin user created (username: admin, password: admin123)');
  }
};

const insertSampleData = () => {
  // Check if sample data already exists
  const stockCount = db.prepare('SELECT COUNT(*) as count FROM stock_items').get();
  
  if (stockCount.count === 0) {
    // Insert sample stock items
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

    const insertStock = db.prepare(`
      INSERT INTO stock_items (barcode, name, quantity, price, expiry_date, status, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    sampleItems.forEach(item => {
      insertStock.run(
        item.barcode,
        item.name,
        item.quantity,
        item.price,
        item.expiry_date,
        item.status,
        item.reorder_level
      );
    });

    console.log('✅ Sample data inserted');
  }
};

// Export database instance and initialization function
module.exports = {
  db,
  initializeDatabase
}; 