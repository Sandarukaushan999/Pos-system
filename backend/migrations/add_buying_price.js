const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.db');

function addBuyingPrice() {
  const db = new sqlite3.Database(DB_PATH);
  
  db.serialize(() => {
    console.log('Adding buying_price column to stock_items table...');
    
    // Add buying_price column to stock_items table
    db.run(`ALTER TABLE stock_items ADD COLUMN buying_price REAL DEFAULT 0`, (err) => {
      if (err) {
        console.log('Column might already exist or error:', err.message);
      } else {
        console.log('Successfully added buying_price column to stock_items');
      }
    });
    
    // Add buying_price column to sales_items table
    db.run(`ALTER TABLE sales_items ADD COLUMN buying_price REAL DEFAULT 0`, (err) => {
      if (err) {
        console.log('Column might already exist or error:', err.message);
      } else {
        console.log('Successfully added buying_price column to sales_items');
      }
    });
    
    // Add profit tracking to sales table
    db.run(`ALTER TABLE sales ADD COLUMN total_profit REAL DEFAULT 0`, (err) => {
      if (err) {
        console.log('Column might already exist or error:', err.message);
      } else {
        console.log('Successfully added total_profit column to sales');
      }
    });
    
    // Update existing records to have default buying_price values
    db.run(`UPDATE stock_items SET buying_price = price WHERE buying_price = 0 OR buying_price IS NULL`, (err) => {
      if (err) {
        console.log('Error updating existing stock_items:', err.message);
      } else {
        console.log('Updated existing stock_items with default buying_price');
      }
    });
    
    // Update existing sales_items to have buying_price (set to 0 for historical data)
    db.run(`UPDATE sales_items SET buying_price = 0 WHERE buying_price IS NULL`, (err) => {
      if (err) {
        console.log('Error updating existing sales_items:', err.message);
      } else {
        console.log('Updated existing sales_items with default buying_price');
      }
    });
    
    // Update existing sales to have total_profit (set to 0 for historical data)
    db.run(`UPDATE sales SET total_profit = 0 WHERE total_profit IS NULL`, (err) => {
      if (err) {
        console.log('Error updating existing sales:', err.message);
      } else {
        console.log('Updated existing sales with default total_profit');
      }
    });
  });
  
  db.close((err) => {
    if (err) {
      console.log('Error closing database:', err.message);
    } else {
      console.log('Migration completed successfully!');
    }
  });
}

// Run the migration
addBuyingPrice(); 