const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getDb } = require('../models/database');

const migration = {
  name: 'add_customer_mobile_to_sales',
  up: () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      // Add customer_mobile column to sales table
      db.run(`ALTER TABLE sales ADD COLUMN customer_mobile TEXT`, (err) => {
        if (err) {
          console.log('Migration error (may already exist):', err.message);
          // Column might already exist, that's okay
        }
        console.log('Added customer_mobile column to sales table');
        
        // Add customer_name column as well for better customer tracking
        db.run(`ALTER TABLE sales ADD COLUMN customer_name TEXT`, (err2) => {
          if (err2) {
            console.log('Migration error (may already exist):', err2.message);
          }
          console.log('Added customer_name column to sales table');
          
          db.close();
          resolve();
        });
      });
    });
  },
  
  down: () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      // Note: SQLite doesn't support DROP COLUMN easily, so we'll skip the down migration
      console.log('Down migration not implemented for SQLite');
      db.close();
      resolve();
    });
  }
};

module.exports = migration;
