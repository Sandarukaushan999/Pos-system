const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.db');

function removeBarcodeUniqueConstraint() {
  const db = new sqlite3.Database(DB_PATH);
  
  db.serialize(() => {
    console.log('Removing unique constraint from barcode field...');
    
    // Create a new table without the unique constraint
    db.run(`CREATE TABLE IF NOT EXISTS stock_items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      buying_price REAL DEFAULT 0,
      expiry_date DATE,
      status TEXT NOT NULL DEFAULT 'pending',
      reorder_level INTEGER NOT NULL DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Copy data from old table to new table
    db.run(`INSERT INTO stock_items_new 
            SELECT id, barcode, name, quantity, price, buying_price, expiry_date, status, reorder_level, created_at, updated_at 
            FROM stock_items`);
    
    // Drop the old table
    db.run(`DROP TABLE stock_items`);
    
    // Rename new table to original name
    db.run(`ALTER TABLE stock_items_new RENAME TO stock_items`);
    
    console.log('Successfully removed unique constraint from barcode field');
  });
  
  db.close();
}

// Run the migration
removeBarcodeUniqueConstraint(); 