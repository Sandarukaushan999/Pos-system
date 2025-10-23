const smsService = require('./backend/services/smsService');

// Test SMS service
console.log('Testing SMS Service...');
console.log('SMS Service configured:', smsService.isConfigured);

// Test phone number validation
const testNumbers = [
  '0712345678',
  '0771234567',
  '+94771234567',
  '1234567890'
];

console.log('\nTesting phone number validation:');
testNumbers.forEach(number => {
  const formatted = smsService.validatePhoneNumber(number);
  console.log(`${number} -> ${formatted}`);
});

// Test SMS formatting
const mockInvoiceData = {
  sale: {
    invoice_number: 'INV-20251023-001',
    created_at: new Date(),
    total_amount: 1250.00,
    payment_type: 'cash'
  },
  items: [
    { name: 'Coca Cola 500ml', quantity: 2, price: 150.00 },
    { name: 'Bread Loaf', quantity: 1, price: 95.00 }
  ]
};

console.log('\nTesting SMS message formatting:');
const message = smsService.formatInvoiceForSMS(mockInvoiceData);
console.log('Formatted message:');
console.log(message);

console.log('\nTesting SMS sending (mock mode):');
smsService.sendSMS('+94771234567', 'Test message from POS system')
  .then(result => {
    console.log('SMS result:', result);
  })
  .catch(error => {
    console.error('SMS error:', error);
  });
