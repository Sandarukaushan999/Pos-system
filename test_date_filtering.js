const moment = require('moment');

// Test the date filtering logic
function testDateFiltering() {
  console.log('Testing date filtering logic...');
  
  // Test case 1: start_date and end_date provided
  const start_date = '2025-09-01';
  const end_date = '2025-10-23';
  
  let dateFilter = '';
  let queryParams = [];
  
  if (start_date && end_date) {
    dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
    queryParams = [start_date, end_date];
  }
  
  console.log('Date filter:', dateFilter);
  console.log('Query params:', queryParams);
  
  // Test case 2: period provided
  const period = 'month';
  const today = moment();
  
  switch (period) {
    case 'today':
      dateFilter = 'WHERE DATE(s.created_at) = ?';
      queryParams = [today.format('YYYY-MM-DD')];
      break;
    case 'week':
      const weekStart = today.startOf('week').format('YYYY-MM-DD');
      const weekEnd = today.endOf('week').format('YYYY-MM-DD');
      dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
      queryParams = [weekStart, weekEnd];
      break;
    case 'month':
      const monthStart = today.startOf('month').format('YYYY-MM-DD');
      const monthEnd = today.endOf('month').format('YYYY-MM-DD');
      dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
      queryParams = [monthStart, monthEnd];
      break;
    case 'year':
      const yearStart = today.startOf('year').format('YYYY-MM-DD');
      const yearEnd = today.endOf('year').format('YYYY-MM-DD');
      dateFilter = 'WHERE DATE(s.created_at) BETWEEN ? AND ?';
      queryParams = [yearStart, yearEnd];
      break;
  }
  
  console.log('Period filter:', dateFilter);
  console.log('Period params:', queryParams);
  
  // Test the final query
  const query = `SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.cashier_id = u.id ${dateFilter} ORDER BY s.created_at DESC`;
  console.log('Final query:', query);
}

testDateFiltering();
