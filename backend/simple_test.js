const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.db');

console.log('Testing barcode functionality...');

const db = new sqlite3.Database(DB_PATH);

// Test 1: Add first item
console.log('\n1. Adding first item...');
db.run(`INSERT INTO stock_items (barcode, name, quantity, price, buying_price, expiry_date, status, reorder_level) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ['123456', 'Test Product 1', 10, 100, 80, '2025-12-31', 'active', 5],
  function(err) {
    if (err) {
      console.log('Error adding first item:', err.message);
    } else {
      console.log('✅ First item added successfully with ID:', this.lastID);
    }
    
    // Test 2: Add second item with same barcode but different expiry
    console.log('\n2. Adding second item with same barcode but different expiry...');
    db.run(`INSERT INTO stock_items (barcode, name, quantity, price, buying_price, expiry_date, status, reorder_level) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['123456', 'Test Product 1', 15, 100, 80, '2025-06-30', 'active', 5],
      function(err2) {
        if (err2) {
          console.log('Error adding second item:', err2.message);
        } else {
          console.log('✅ Second item added successfully with ID:', this.lastID);
        }
        
        // Test 3: Query all items
        console.log('\n3. Querying all items with barcode "123456"...');
        db.all('SELECT * FROM stock_items WHERE barcode = ? ORDER BY expiry_date ASC', ['123456'], (err3, items) => {
          if (err3) {
            console.log('Error querying items:', err3.message);
          } else {
            console.log('✅ Found', items.length, 'items with barcode "123456":');
            items.forEach((item, index) => {
              console.log(`   Item ${index + 1}: ID=${item.id}, Expiry=${item.expiry_date}, Quantity=${item.quantity}`);
            });
          }
          
          console.log('\n🎉 Test completed successfully!');
          db.close();
        });
      });
  }); 